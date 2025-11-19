// App.tsx – MedIntelli Clínica V3 (arquivo único)

// Requisitos:
// 1) Dependências no package.json:
//    "react", "react-dom", "react-router-dom", "@supabase/supabase-js"
// 2) Variáveis de ambiente (Vercel / .env.local):
//    VITE_SUPABASE_URL
//    VITE_SUPABASE_ANON_KEY
//    VITE_OPENAI_API_KEY
// 3) Tabelas no Supabase (patients, appointments, waitlist, messages)
//    + campo cpf em patients (para login do paciente no app paciente)

import React, { useEffect, useMemo, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// --------------------------
// Supabase client
// --------------------------
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  console.warn("⚠️ Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// --------------------------
// Tipos
// --------------------------
type Section =
  | "dashboard"
  | "pacientes"
  | "agenda"
  | "waitlist"
  | "chat"
  | "mensagens"
  | "config";

type Patient = {
  id: string;
  name: string;
  cpf: string | null;
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
  patient_id?: string | null;
  patients?: { name: string | null } | null;
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

type MessageRow = {
  id: string;
  channel: string;
  external_id: string | null;
  patient_id: string | null;
  direction: "in" | "out";
  source: "ia" | "humano";
  content: string;
  status: string;
  created_at: string;
  patients?: { name: string | null } | null;
};

type Conversation = {
  key: string;
  title: string;
  lastMessage: MessageRow;
  channel: string;
  status: string;
};

// --------------------------
// Base de conhecimento (IA Clínica)
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
// Layout
// --------------------------
function Sidebar(props: { active: Section; onChange: (s: Section) => void }) {
  const items: { id: Section; label: string }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "pacientes", label: "Pacientes" },
    { id: "agenda", label: "Agenda" },
    { id: "waitlist", label: "Fila de Espera" },
    { id: "mensagens", label: "Mensagens" },
    { id: "chat", label: "Chat IA" },
    { id: "config", label: "Configurações" },
  ];

  return (
    <aside
      style={{
        width: 240,
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

function PageContainer(props: {
  title: string;
  children: React.ReactNode;
  extra?: React.ReactNode;
}) {
  return (
    <div style={{ padding: 20 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 12,
        }}
      >
        <h1 style={{ fontSize: 22 }}>{props.title}</h1>
        {props.extra}
      </div>
      <div>{props.children}</div>
    </div>
  );
}

// --------------------------
// Dashboard
// --------------------------
function DashboardSection() {
  return (
    <PageContainer title="Dashboard">
      <p style={{ marginBottom: 8 }}>
        Bem-vindo ao painel da clínica MedIntelli Basic V3.
      </p>
      <ul>
        <li>✅ Cadastro e consulta de pacientes</li>
        <li>✅ Agenda semanal estilo Google (visão por dia)</li>
        <li>✅ Fila de espera com prioridade</li>
        <li>✅ Central de Mensagens (APP + WhatsApp + IA/Humano)</li>
        <li>✅ Chat IA usando OpenAI + base de conhecimento da clínica</li>
      </ul>
    </PageContainer>
  );
}

// --------------------------
// Pacientes (CRUD simples)
// --------------------------
function PacientesSection() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    cpf: "",
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
      cpf: form.cpf || null,
      phone: form.phone || null,
      birth_date: form.birth_date || null,
      notes: form.notes || null,
    });

    if (error) {
      console.error(error);
      setError("Erro ao salvar paciente.");
    } else {
      setForm({
        name: "",
        cpf: "",
        phone: "",
        birth_date: "",
        notes: "",
      });
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
          maxWidth: 520,
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
          name="cpf"
          value={form.cpf}
          onChange={handleChange}
          placeholder="CPF (para acesso ao app paciente)"
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
              <th style={{ border: "1px solid #ccc", padding: 6 }}>CPF</th>
              <th style={{ border: "1px solid #ccc", padding: 6 }}>
                Telefone
              </th>
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
                  {p.cpf || "-"}
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
// Agenda semanal (estilo Google)
// --------------------------
function getMonday(d: Date) {
  const date = new Date(d);
  const day = date.getDay(); // 0=Domingo
  const diff = (day === 0 ? -6 : 1) - day; // segunda
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

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
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));

  async function loadData(currentWeek: Date) {
    setLoading(true);

    const monday = new Date(currentWeek);
    const nextMonday = new Date(monday);
    nextMonday.setDate(nextMonday.getDate() + 7);

    const [pats, apps] = await Promise.all([
      supabase.from("patients").select("id,name").order("name"),
      supabase
        .from("appointments")
        .select("id,start_time,status,reason,patient_id,patients(name)")
        .gte("start_time", monday.toISOString())
        .lt("start_time", nextMonday.toISOString())
        .order("start_time", { ascending: true }),
    ]);

    if (!pats.error && pats.data) setPatients(pats.data as Patient[]);
    if (!apps.error && apps.data) setAppointments(apps.data as Appointment[]);

    setLoading(false);
  }

  useEffect(() => {
    loadData(weekStart);
  }, [weekStart]);

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
      await loadData(weekStart);
    }
  }

  function changeWeek(delta: number) {
    const newStart = new Date(weekStart);
    newStart.setDate(newStart.getDate() + delta * 7);
    setWeekStart(getMonday(newStart));
  }

  const weekDays = useMemo(() => {
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      days.push(d);
    }
    return days;
  }, [weekStart]);

  function formatDay(d: Date) {
    return d.toLocaleDateString("pt-BR", {
      weekday: "short",
      day: "2-digit",
      month: "2-digit",
    });
  }

  function appointmentsForDay(d: Date) {
    const y = d.getFullYear();
    const m = d.getMonth();
    const day = d.getDate();
    return appointments.filter((a) => {
      const dt = new Date(a.start_time);
      return (
        dt.getFullYear() === y &&
        dt.getMonth() === m &&
        dt.getDate() === day
      );
    });
  }

  function statusColor(status: string) {
    switch (status) {
      case "confirmado":
        return "#198754"; // verde
      case "cancelado":
        return "#dc3545"; // vermelho
      case "concluido":
        return "#6c757d"; // cinza
      default:
        return "#0d6efd"; // azul
    }
  }

  const weekLabel = `${weekDays[0].toLocaleDateString("pt-BR")} - ${weekDays[
    6
  ].toLocaleDateString("pt-BR")}`;

  return (
    <PageContainer
      title="Agenda semanal"
      extra={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => changeWeek(-1)}>{"< Semana anterior"}</button>
          <span>{weekLabel}</span>
          <button onClick={() => changeWeek(1)}>{"Próxima semana >"}</button>
        </div>
      }
    >
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

      <h3>Visão semanal (estilo Google)</h3>
      {loading ? (
        <p>Carregando...</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(7, 1fr)",
            gap: 8,
            marginTop: 8,
          }}
        >
          {weekDays.map((d) => {
            const dayAppointments = appointmentsForDay(d);
            return (
              <div
                key={d.toISOString()}
                style={{
                  background: "#fff",
                  borderRadius: 8,
                  border: "1px solid #ddd",
                  padding: 8,
                  minHeight: 120,
                  boxSizing: "border-box",
                }}
              >
                <div
                  style={{
                    fontWeight: "bold",
                    fontSize: 13,
                    marginBottom: 4,
                  }}
                >
                  {formatDay(d)}
                </div>
                {dayAppointments.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#888" }}>
                    Sem consultas
                  </div>
                ) : (
                  dayAppointments.map((a) => (
                    <div
                      key={a.id}
                      style={{
                        borderLeft: `4px solid ${statusColor(a.status)}`,
                        background: "#f8f9fa",
                        borderRadius: 4,
                        padding: "4px 6px",
                        marginBottom: 4,
                        fontSize: 12,
                      }}
                    >
                      <div style={{ fontWeight: 600 }}>
                        {new Date(a.start_time).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        - {a.patients?.name || "Paciente"}
                      </div>
                      <div>Status: {a.status}</div>
                      {a.reason && (
                        <div style={{ color: "#555" }}>{a.reason}</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}

// --------------------------
// Fila de Espera
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
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
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
// Chat IA simples
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
// Central de Mensagens (Clínica)
// --------------------------
function MessagesSection() {
  const [allMessages, setAllMessages] = useState<MessageRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function loadMessages() {
    setLoading(true);
    const { data, error } = await supabase
      .from("messages")
      .select("id,channel,external_id,patient_id,direction,source,content,status,created_at,patients(name)")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setError("Erro ao carregar mensagens.");
    } else {
      setAllMessages((data || []) as MessageRow[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadMessages();
  }, []);

  const conversations: Conversation[] = useMemo(() => {
    const map = new Map<string, Conversation>();

    for (const msg of allMessages) {
      const key =
        (msg.external_id || "sem-id") + "|" + (msg.patient_id || "sem-paciente");
      const existing = map.get(key);

      if (!existing) {
        map.set(key, {
          key,
          title:
            msg.patients?.name ||
            msg.external_id ||
            "Contato sem identificação",
          lastMessage: msg,
          channel: msg.channel,
          status: msg.status,
        });
      } else {
        // como está ordenado da mais recente p/ mais antiga, o primeiro é o mais atual
        continue;
      }
    }

    return Array.from(map.values());
  }, [allMessages]);

  const selectedMessages = useMemo(() => {
    if (!selectedKey) return [];
    const [ext, pid] = selectedKey.split("|");
    return allMessages
      .filter(
        (m) =>
          (m.external_id || "sem-id") === ext &&
          (m.patient_id || "sem-paciente") === pid
      )
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime()
      );
  }, [selectedKey, allMessages]);

  async function sendMessage(source: "ia" | "humano") {
    if (!selectedKey || !reply.trim()) return;
    setSending(true);
    setError("");

    const [ext, pid] = selectedKey.split("|");
    const patient_id = pid === "sem-paciente" ? null : pid;

    try {
      // 1) Inserir mensagem no Supabase
      const { error } = await supabase.from("messages").insert({
        channel: "whatsapp", // ajustar se for outro canal
        external_id: ext === "sem-id" ? null : ext,
        patient_id,
        direction: "out",
        source,
        content: reply,
        status: "em_atendimento",
      });

      if (error) {
        console.error(error);
        setError("Erro ao salvar mensagem.");
      } else {
        setReply("");
        await loadMessages();
      }

      // 2) (Opcional) chamar backend para enviar via AVISA API:
      // await fetch("/api/send-whatsapp", { method: "POST", body: JSON.stringify({ to: ext, text: reply }) });

    } catch (e) {
      console.error(e);
      setError("Falha ao enviar mensagem.");
    } finally {
      setSending(false);
    }
  }

  async function sendWithIA() {
    if (!selectedKey || !reply.trim()) return;

    setSending(true);
    setError("");

    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string;
      if (!apiKey) {
        setError("VITE_OPENAI_API_KEY não configurado.");
        setSending(false);
        return;
      }

      const historyText = selectedMessages
        .map(
          (m) =>
            `${m.direction === "in" ? "Paciente" : "Clínica"}: ${m.content}`
        )
        .join("\n");

      const prompt = `
Você é o assistente da clínica MedIntelli.

Histórico recente:
${historyText}

Nova pergunta / mensagem do paciente:
${reply}

Responda de forma objetiva, educada, sem diagnóstico, focando em:
- orientações gerais
- explicação de horários
- orientação para ligar ou procurar atendimento quando necessário.
`;

      const payload = {
        model: "gpt-4o-mini",
        messages: [
          { role: "system" as const, content: CLINIC_KNOWLEDGE_BASE },
          { role: "user" as const, content: prompt },
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
      const answer: string =
        data.choices?.[0]?.message?.content ||
        "Desculpe, não consegui gerar uma resposta agora.";

      const [ext, pid] = selectedKey.split("|");
      const patient_id = pid === "sem-paciente" ? null : pid;

      const { error } = await supabase.from("messages").insert({
        channel: "whatsapp",
        external_id: ext === "sem-id" ? null : ext,
        patient_id,
        direction: "out",
        source: "ia",
        content: answer,
        status: "em_atendimento",
      });

      if (error) {
        console.error(error);
        setError("Erro ao salvar resposta da IA.");
      } else {
        setReply("");
        await loadMessages();
      }

      // (Opcional) enviar essa resposta via AVISA API no backend

    } catch (e) {
      console.error(e);
      setError("Falha ao gerar resposta da IA.");
    } finally {
      setSending(false);
    }
  }

  return (
    <PageContainer title="Central de Mensagens">
      <p style={{ fontSize: 14, color: "#555", marginBottom: 8 }}>
        Aqui você acompanha todas as conversas do APP e WhatsApp.
        <br />
        Integração com AVISA API deve ser feita via backend / Edge Functions.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "260px 1fr",
          gap: 12,
          height: 480,
        }}
      >
        {/* Lista de conversas */}
        <div
          style={{
            border: "1px solid #ccc",
            borderRadius: 8,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: 8,
              background: "#f1f3f5",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            Conversas
          </div>
          <div
            style={{
              flex: 1,
              overflowY: "auto",
            }}
          >
            {loading ? (
              <p style={{ padding: 8 }}>Carregando...</p>
            ) : conversations.length === 0 ? (
              <p style={{ padding: 8, fontSize: 13 }}>Nenhuma conversa ainda.</p>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.key}
                  onClick={() => setSelectedKey(c.key)}
                  style={{
                    display: "block",
                    width: "100%",
                    textAlign: "left",
                    border: "none",
                    borderBottom: "1px solid #eee",
                    padding: 8,
                    background:
                      selectedKey === c.key ? "#e7f1ff" : "transparent",
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  <div style={{ fontWeight: 600 }}>{c.title}</div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#666",
                      marginTop: 2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {c.lastMessage.content}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#999",
                      marginTop: 2,
                    }}
                  >
                    {c.channel.toUpperCase()} • {c.status}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat da conversa selecionada */}
        <div
          style={{
            border: "1px solid #ccc",
            borderRadius: 8,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              padding: 8,
              background: "#f1f3f5",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            {selectedKey
              ? "Histórico da conversa"
              : "Selecione uma conversa à esquerda"}
          </div>

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: 8,
              background: "#fafafa",
            }}
          >
            {!selectedKey ? (
              <p style={{ fontSize: 13, color: "#666" }}>
                Nenhuma conversa selecionada.
              </p>
            ) : selectedMessages.length === 0 ? (
              <p style={{ fontSize: 13, color: "#666" }}>
                Sem mensagens ainda nessa conversa.
              </p>
            ) : (
              selectedMessages.map((m) => (
                <div
                  key={m.id}
                  style={{
                    textAlign: m.direction === "in" ? "left" : "right",
                    marginBottom: 6,
                  }}
                >
                  <div
                    style={{
                      display: "inline-block",
                      padding: "6px 10px",
                      borderRadius: 10,
                      background:
                        m.direction === "in" ? "#e0e0e0" : "#1a73e8",
                      color: m.direction === "in" ? "#000" : "#fff",
                      maxWidth: "80%",
                      whiteSpace: "pre-wrap",
                      fontSize: 13,
                    }}
                  >
                    {m.content}
                  </div>
                  <div
                    style={{
                      fontSize: 10,
                      color: "#888",
                      marginTop: 2,
                    }}
                  >
                    {new Date(m.created_at).toLocaleString("pt-BR")} •{" "}
                    {m.source === "ia" ? "IA" : "Humano"}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Caixa de resposta */}
          <div
            style={{
              borderTop: "1px solid #ddd",
              padding: 8,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            <textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Digite sua resposta..."
              rows={2}
              style={{
                width: "100%",
                resize: "vertical",
                padding: 6,
                borderRadius: 6,
                border: "1px solid #ccc",
                fontSize: 13,
              }}
              disabled={!selectedKey || sending}
            />
            {error && (
              <div style={{ color: "red", fontSize: 12 }}>{error}</div>
            )}
            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
              <button
                onClick={() => sendMessage("humano")}
                disabled={!selectedKey || sending || !reply.trim()}
              >
                Enviar como humano
              </button>
              <button
                onClick={sendWithIA}
                disabled={!selectedKey || sending || !reply.trim()}
              >
                Gerar resposta com IA
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  );
}

// --------------------------
// Config (placeholder)
// --------------------------
function ConfigSection() {
  return (
    <PageContainer title="Configurações">
      <p>
        Aqui você poderá configurar usuários, permissões, horários padrão,
        mensagens automáticas etc.
      </p>
      <p style={{ marginTop: 8 }}>
        Principais pontos técnicos hoje:
      </p>
      <ul>
        <li>🔑 Variáveis de ambiente (Supabase e OpenAI)</li>
        <li>🗄️ Tabelas do Supabase (patients, appointments, waitlist, messages)</li>
        <li>🤖 Ajustar a base de conhecimento da clínica (CLINIC_KNOWLEDGE_BASE)</li>
        <li>📲 Integração WhatsApp via AVISA API (no backend)</li>
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
        {section === "mensagens" && <MessagesSection />}
        {section === "config" && <ConfigSection />}
      </div>
    </div>
  );
}
