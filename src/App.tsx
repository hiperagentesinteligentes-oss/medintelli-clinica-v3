// App.tsx - MedIntelli Clínica (arquivo único)
// -------------------------------------------
// Requisitos:
// 1) Dependências no package.json:
//    "react", "react-dom", "react-router-dom", "@supabase/supabase-js"
// 2) Variáveis de ambiente no Vercel (ou .env.local):
//    VITE_SUPABASE_URL       = https://SEU-PROJETO.supabase.co
//    VITE_SUPABASE_ANON_KEY  = sua chave anon do Supabase
//    VITE_OPENAI_API_KEY     = sua chave sk-... da OpenAI
// 3) Tabelas no Supabase (patients, appointments, waitlist):
//
//    create table if not exists patients (
//      id uuid primary key default gen_random_uuid(),
//      name text not null,
//      phone text,
//      birth_date date,
//      notes text,
//      created_at timestamptz default now()
//    );
//
//    create table if not exists appointments (
//      id uuid primary key default gen_random_uuid(),
//      patient_id uuid references patients(id) on delete cascade,
//      start_time timestamptz not null,
//      end_time timestamptz,
//      status text default 'agendado',
//      reason text,
//      created_at timestamptz default now()
//    );
//
//    create table if not exists waitlist (
//      id uuid primary key default gen_random_uuid(),
//      patient_name text not null,
//      phone text,
//      reason text,
//      priority int default 1,
//      created_at timestamptz default now()
//    );
//
//    -- Para teste rápido, desative RLS:
//    alter table patients disable row level security;
//    alter table appointments disable row level security;
//    alter table waitlist disable row level security;

import React, { useEffect, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// --------------------------
// Supabase client (único)
// --------------------------
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// --------------------------
// Tipos básicos
// --------------------------
type Section =
  | "dashboard"
  | "pacientes"
  | "agenda"
  | "waitlist"
  | "chat"
  | "config";

type Patient = {
  id: string;
  name: string;
  phone: string | null;
  birth_date: string | null;
  notes: string | null;
  created_at: string;
};

type Appointment = {
  id: string;
  start_time: string;
  status: string;
  reason: string | null;
  patients?: { name: string };
};

type WaitlistItem = {
  id: string;
  patient_name: string;
  phone: string | null;
  reason: string | null;
  priority: number;
  created_at: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

// --------------------------
// Base de conhecimento simples da clínica (system prompt)
// --------------------------
const CLINIC_KNOWLEDGE_BASE = `
Você é o assistente da clínica MedIntelli.

Regras:
- Seja objetivo, educado e profissional.
- Responda dúvidas sobre: agendamentos, horários, retornos, orientações gerais.
- NÃO faça diagnóstico médico nem prescrição.
- Em caso de urgência, oriente procurar pronto-atendimento.
- Em caso de dúvidas específicas, oriente falar diretamente com o médico.

A clínica oferece: consultas eletivas, retornos, exames complementares, orientações de rotina.
`;

// --------------------------
// Componentes de layout
// --------------------------

function Sidebar(props: {
  active: Section;
  onChange: (s: Section) => void;
}) {
  const items: { id: Section; label: string }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "pacientes", label: "Pacientes" },
    { id: "agenda", label: "Agenda" },
    { id: "waitlist", label: "Fila de Espera" },
    { id: "chat", label: "Chat IA" },
    { id: "config", label: "Configurações" },
  ];

  return (
    <aside
      style={{
        width: 230,
        background: "#e6f0ff",
        padding: 16,
        boxSizing: "border-box",
        minHeight: "100vh",
      }}
    >
      <h2
        style={{
          fontSize: 20,
          fontWeight: 700,
          marginBottom: 16,
          color: "#1a3f8b",
        }}
      >
        MedIntelli Clínica
      </h2>
      <nav style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => props.onChange(item.id)}
            style={{
              textAlign: "left",
              border: "none",
              padding: "8px 10px",
              borderRadius: 6,
              background:
                props.active === item.id ? "#1a73e8" : "transparent",
              color: props.active === item.id ? "#fff" : "#123",
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function PageContainer(props: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: 20 }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>{props.title}</h1>
      <div>{props.children}</div>
    </div>
  );
}

// --------------------------
// Seção: Dashboard
// --------------------------

function DashboardSection() {
  return (
    <PageContainer title="Dashboard">
      <p style={{ marginBottom: 8 }}>
        Bem-vindo ao painel da clínica. Aqui você pode acompanhar pacientes,
        agenda, fila de espera e utilizar o Chat de IA.
      </p>
      <ul>
        <li>✅ Cadastro e consulta de pacientes</li>
        <li>✅ Agenda básica com status</li>
        <li>✅ Fila de espera por prioridade</li>
        <li>✅ Chat IA usando OpenAI + base de conhecimento</li>
      </ul>
    </PageContainer>
  );
}

// --------------------------
// Seção: Pacientes (CRUD simples)
// --------------------------

function PacientesSection() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    birth_date: "",
    notes: "",
  });

  async function loadPatients() {
    setLoading(true);
    setError("");
    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setError("Erro ao carregar pacientes.");
    } else {
      setPatients((data || []) as Patient[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadPatients();
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    setError("");

    const { error } = await supabase.from("patients").insert({
      name: form.name,
      phone: form.phone || null,
      birth_date: form.birth_date || null,
      notes: form.notes || null,
    });

    if (error) {
      console.error(error);
      setError("Erro ao salvar paciente.");
    } else {
      setForm({ name: "", phone: "", birth_date: "", notes: "" });
      await loadPatients();
    }

    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Deseja realmente excluir este paciente?")) return;
    const { error } = await supabase.from("patients").delete().eq("id", id);
    if (error) {
      console.error(error);
      alert("Erro ao excluir.");
    } else {
      setPatients((prev) => prev.filter((p) => p.id !== id));
    }
  }

  return (
    <PageContainer title="Pacientes">
      <h3>Novo paciente</h3>
      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gap: 8,
          maxWidth: 480,
          marginBottom: 16,
        }}
      >
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Nome *"
          required
          style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
        />
        <input
          name="phone"
          value={form.phone}
          onChange={handleChange}
          placeholder="Telefone"
          style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
        />
        <input
          type="date"
          name="birth_date"
          value={form.birth_date}
          onChange={handleChange}
          style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
        />
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          placeholder="Observações"
          rows={3}
          style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
        />
        <button
          type="submit"
          disabled={saving}
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            border: "none",
            background: "#1a73e8",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          {saving ? "Salvando..." : "Salvar paciente"}
        </button>
      </form>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <h3>Lista de pacientes</h3>
      {loading ? (
        <p>Carregando...</p>
      ) : patients.length === 0 ? (
        <p>Nenhum paciente cadastrado.</p>
      ) : (
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            fontSize: 14,
          }}
        >
          <thead>
            <tr style={{ background: "#e6f0ff" }}>
              <th style={{ border: "1px solid #ccc", padding: 6 }}>Nome</th>
              <th style={{ border: "1px solid #ccc", padding: 6 }}>Telefone</th>
              <th style={{ border: "1px solid #ccc", padding: 6 }}>
                Nascimento
              </th>
              <th style={{ border: "1px solid #ccc", padding: 6 }}>Obs.</th>
              <th style={{ border: "1px solid #ccc", padding: 6 }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((p) => (
              <tr key={p.id}>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>
                  {p.name}
                </td>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>
                  {p.phone || "-"}
                </td>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>
                  {p.birth_date || "-"}
                </td>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>
                  {p.notes || "-"}
                </td>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>
                  <button onClick={() => handleDelete(p.id)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </PageContainer>
  );
}

// --------------------------
// Seção: Agenda (consultas)
// --------------------------

function AgendaSection() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    patient_id: "",
    date: "",
    time: "",
    reason: "",
  });

  async function loadData() {
    setLoading(true);

    const [pats, apps] = await Promise.all([
      supabase.from("patients").select("id,name").order("name"),
      supabase
        .from("appointments")
        .select("id,start_time,status,reason,patients(name)")
        .order("start_time", { ascending: true }),
    ]);

    if (!pats.error && pats.data) {
      setPatients(pats.data as Patient[]);
    }

    if (!apps.error && apps.data) {
      setAppointments(apps.data as Appointment[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.patient_id || !form.date || !form.time) return;

    const start = new Date(`${form.date}T${form.time}:00`);

    const { error } = await supabase.from("appointments").insert({
      patient_id: form.patient_id,
      start_time: start.toISOString(),
      reason: form.reason || null,
      status: "agendado",
    });

    if (error) {
      console.error(error);
      alert("Erro ao agendar.");
    } else {
      setForm({ patient_id: "", date: "", time: "", reason: "" });
      await loadData();
    }
  }

  async function updateStatus(id: string, status: string) {
    const { error } = await supabase
      .from("appointments")
      .update({ status })
      .eq("id", id);
    if (error) {
      console.error(error);
      alert("Erro ao atualizar status.");
    } else {
      await loadData();
    }
  }

  return (
    <PageContainer title="Agenda">
      <h3>Novo agendamento</h3>
      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gap: 8,
          maxWidth: 520,
          marginBottom: 16,
        }}
      >
        <select
          name="patient_id"
          value={form.patient_id}
          onChange={handleChange}
          required
          style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
        >
          <option value="">Selecione o paciente</option>
          {patients.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <div style={{ display: "flex", gap: 8 }}>
          <input
            type="date"
            name="date"
            value={form.date}
            onChange={handleChange}
            required
            style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
          />
          <input
            type="time"
            name="time"
            value={form.time}
            onChange={handleChange}
            required
            style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
          />
        </div>

        <input
          name="reason"
          value={form.reason}
          onChange={handleChange}
          placeholder="Motivo / Observações"
          style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
        />

        <button
          type="submit"
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            border: "none",
            background: "#1a73e8",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Agendar
        </button>
      </form>

      <h3>Consultas agendadas</h3>
      {loading ? (
        <p>Carregando...</p>
      ) : appointments.length === 0 ? (
        <p>Sem consultas agendadas.</p>
      ) : (
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            fontSize: 14,
          }}
        >
          <thead>
            <tr style={{ background: "#e6f0ff" }}>
              <th style={{ border: "1px solid #ccc", padding: 6 }}>Paciente</th>
              <th style={{ border: "1px solid #ccc", padding: 6 }}>
                Data / Hora
              </th>
              <th style={{ border: "1px solid #ccc", padding: 6 }}>Status</th>
              <th style={{ border: "1px solid #ccc", padding: 6 }}>Motivo</th>
              <th style={{ border: "1px solid #ccc", padding: 6 }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((a) => (
              <tr key={a.id}>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>
                  {a.patients?.name || "-"}
                </td>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>
                  {new Date(a.start_time).toLocaleString("pt-BR")}
                </td>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>
                  {a.status}
                </td>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>
                  {a.reason || "-"}
                </td>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>
                  <button onClick={() => updateStatus(a.id, "confirmado")}>
                    Confirmar
                  </button>{" "}
                  <button onClick={() => updateStatus(a.id, "cancelado")}>
                    Cancelar
                  </button>{" "}
                  <button onClick={() => updateStatus(a.id, "concluido")}>
                    Concluído
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </PageContainer>
  );
}

// --------------------------
// Seção: Fila de espera
// --------------------------

function WaitlistSection() {
  const [items, setItems] = useState<WaitlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    patient_name: "",
    phone: "",
    reason: "",
    priority: "1",
  });

  async function loadList() {
    setLoading(true);
    const { data, error } = await supabase
      .from("waitlist")
      .select("*")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      alert("Erro ao carregar fila de espera.");
    } else {
      setItems((data || []) as WaitlistItem[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadList();
  }, []);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.patient_name.trim()) return;

    const { error } = await supabase.from("waitlist").insert({
      patient_name: form.patient_name,
      phone: form.phone || null,
      reason: form.reason || null,
      priority: Number(form.priority) || 1,
    });

    if (error) {
      console.error(error);
      alert("Erro ao adicionar na fila.");
    } else {
      setForm({ patient_name: "", phone: "", reason: "", priority: "1" });
      await loadList();
    }
  }

  async function handleRemove(id: string) {
    if (!window.confirm("Atender / remover da fila?")) return;
    const { error } = await supabase.from("waitlist").delete().eq("id", id);
    if (error) {
      console.error(error);
      alert("Erro ao remover.");
    } else {
      setItems((prev) => prev.filter((i) => i.id !== id));
    }
  }

  return (
    <PageContainer title="Fila de Espera">
      <h3>Adicionar paciente à fila</h3>
      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gap: 8,
          maxWidth: 520,
          marginBottom: 16,
        }}
      >
        <input
          name="patient_name"
          value={form.patient_name}
          onChange={handleChange}
          placeholder="Nome do paciente *"
          required
          style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
        />
        <input
          name="phone"
          value={form.phone}
          onChange={handleChange}
          placeholder="Telefone"
          style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
        />
        <textarea
          name="reason"
          value={form.reason}
          onChange={handleChange}
          placeholder="Motivo / Observações"
          rows={2}
          style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
        />
        <select
          name="priority"
          value={form.priority}
          onChange={handleChange}
          style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
        >
          <option value="1">Normal</option>
          <option value="2">Prioridade</option>
        </select>
        <button
          type="submit"
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            border: "none",
            background: "#1a73e8",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Adicionar à fila
        </button>
      </form>

      <h3>Fila atual</h3>
      {loading ? (
        <p>Carregando...</p>
      ) : items.length === 0 ? (
        <p>Fila vazia.</p>
      ) : (
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            fontSize: 14,
          }}
        >
          <thead>
            <tr style={{ background: "#e6f0ff" }}>
              <th style={{ border: "1px solid #ccc", padding: 6 }}>Paciente</th>
              <th style={{ border: "1px solid #ccc", padding: 6 }}>
                Telefone
              </th>
              <th style={{ border: "1px solid #ccc", padding: 6 }}>Motivo</th>
              <th style={{ border: "1px solid #ccc", padding: 6 }}>
                Prioridade
              </th>
              <th style={{ border: "1px solid #ccc", padding: 6 }}>Entrada</th>
              <th style={{ border: "1px solid #ccc", padding: 6 }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <tr key={i.id}>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>
                  {i.patient_name}
                </td>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>
                  {i.phone || "-"}
                </td>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>
                  {i.reason || "-"}
                </td>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>
                  {i.priority === 2 ? "Prioridade" : "Normal"}
                </td>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>
                  {new Date(i.created_at).toLocaleString("pt-BR")}
                </td>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>
                  <button onClick={() => handleRemove(i.id)}>
                    Atender / Remover
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </PageContainer>
  );
}

// --------------------------
// Seção: Chat IA (clínica)
// --------------------------

function ChatSection() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Olá! Sou o assistente da clínica MedIntelli. Como posso ajudar hoje?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const newMessages = [...messages, { role: "user", content: input }];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string;
      if (!apiKey) {
        setError("VITE_OPENAI_API_KEY não configurado.");
        setLoading(false);
        return;
      }

      const payload = {
        model: "gpt-4o-mini",
        messages: [
          { role: "system" as const, content: CLINIC_KNOWLEDGE_BASE },
          ...newMessages,
        ],
      };

      const resp = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        throw new Error("Erro API OpenAI: " + resp.status);
      }

      const data = await resp.json();
      const answer =
        data.choices?.[0]?.message?.content ||
        "Desculpe, não consegui gerar uma resposta agora.";

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: String(answer) },
      ]);
    } catch (err) {
      console.error(err);
      setError("Erro ao conversar com a IA. Verifique a chave de API.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageContainer title="Chat IA da Clínica">
      <p style={{ fontSize: 14, color: "#555", marginBottom: 10 }}>
        Chat automático usando OpenAI + base de conhecimento da clínica.
        <br />
        Não substitui consulta médica.
      </p>

      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: 8,
          padding: 12,
          height: 380,
          overflowY: "auto",
          marginBottom: 10,
          background: "#fafafa",
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              textAlign: m.role === "user" ? "right" : "left",
              marginBottom: 8,
            }}
          >
            <div
              style={{
                display: "inline-block",
                padding: "6px 10px",
                borderRadius: 10,
                background: m.role === "user" ? "#1a73e8" : "#e0e0e0",
                color: m.role === "user" ? "#fff" : "#000",
                maxWidth: "80%",
                whiteSpace: "pre-wrap",
                fontSize: 14,
              }}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && <p>IA está respondendo...</p>}
      </div>

      {error && <p style={{ color: "red", fontSize: 12 }}>{error}</p>}

      <form
        onSubmit={handleSend}
        style={{ display: "flex", gap: 8, marginTop: 4 }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Digite sua pergunta..."
          style={{
            flex: 1,
            padding: 8,
            borderRadius: 8,
            border: "1px solid #ccc",
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            border: "none",
            background: "#1a73e8",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Enviar
        </button>
      </form>
    </PageContainer>
  );
}

// --------------------------
// Seção: Config (placeholder)
// --------------------------

function ConfigSection() {
  return (
    <PageContainer title="Configurações">
      <p>
        Aqui você pode, futuramente, configurar usuários, permissões, horários
        padrão, mensagens automáticas etc.
      </p>
      <p style={{ marginTop: 8 }}>
        Por enquanto, as principais configurações são:
      </p>
      <ul>
        <li>🔑 Variáveis de ambiente (Supabase e OpenAI)</li>
        <li>🗄️ Tabelas do Supabase (patients, appointments, waitlist)</li>
        <li>🤖 Ajustar a base de conhecimento no código do Chat IA</li>
      </ul>
    </PageContainer>
  );
}

// --------------------------
// App principal
// --------------------------

export default function App() {
  const [section, setSection] = useState<Section>("dashboard");

  return (
    <div style={{ display: "flex", fontFamily: "system-ui, sans-serif" }}>
      <Sidebar active={section} onChange={setSection} />
      <div style={{ flex: 1, background: "#f5f5f5", minHeight: "100vh" }}>
        {section === "dashboard" && <DashboardSection />}
        {section === "pacientes" && <PacientesSection />}
        {section === "agenda" && <AgendaSection />}
        {section === "waitlist" && <WaitlistSection />}
        {section === "chat" && <ChatSection />}
        {section === "config" && <ConfigSection />}
      </div>
    </div>
  );
}
