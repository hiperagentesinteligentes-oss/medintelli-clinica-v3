// App.tsx - MedIntelli Clínica V3 (arquivo único)
// -------------------------------------------------
// DEPENDÊNCIAS (package.json):
//   "react", "react-dom", "@supabase/supabase-js"
//   "react-router-dom" (se for usar rotas externas - aqui uso só estado)
//   "dayjs" (opcional; aqui não usei para simplificar)
// -------------------------------------------------
// VARIÁVEIS DE AMBIENTE (.env.local ou Vercel):
//   VITE_SUPABASE_URL      = https://SEU-PROJETO.supabase.co
//   VITE_SUPABASE_ANON_KEY = sua chave anon do Supabase
//   VITE_OPENAI_API_KEY    = chave da OpenAI (gpt-4o-mini ou similar)
// -------------------------------------------------
// TABELAS SUPABASE (SQL sugestão):
//
// create table patients (
//   id uuid primary key default gen_random_uuid(),
//   name text not null,
//   cpf text,
//   phone text,
//   email text,
//   birth_date date,
//   notes text,
//   created_at timestamptz default now()
// );
//
// create table appointments (
//   id uuid primary key default gen_random_uuid(),
//   patient_id uuid references patients(id) on delete cascade,
//   start_time timestamptz not null,
//   end_time timestamptz,
//   status text default 'agendado', -- agendado, confirmado, cancelado, concluido
//   reason text,
//   created_at timestamptz default now()
// );
//
// create table waitlist (
//   id uuid primary key default gen_random_uuid(),
//   patient_name text not null,
//   phone text,
//   reason text,
//   priority int default 1, -- 1 normal, 2 prioridade
//   created_at timestamptz default now()
// );
//
// create table holidays (
//   id uuid primary key default gen_random_uuid(),
//   date date not null,
//   description text,
//   is_blocked boolean default true,
//   created_at timestamptz default now()
// );
//
// create table whatsapp_templates (
//   id uuid primary key default gen_random_uuid(),
//   name text not null,
//   content text not null,
//   created_at timestamptz default now()
// );
//
// create table whatsapp_logs (
//   id uuid primary key default gen_random_uuid(),
//   patient_id uuid,
//   phone text,
//   template_id uuid,
//   message text,
//   status text, -- enviado, erro, etc
//   channel text default 'whatsapp',
//   sent_at timestamptz default now()
// );
//
// create table public_validations (
//   id uuid primary key default gen_random_uuid(),
//   code text unique not null,
//   patient_name text,
//   doc_type text,
//   doc_url text,
//   valid boolean default true,
//   created_at timestamptz default now()
// );
//
// -- Para simplificar, pode desativar RLS neste MVP:
// alter table patients disable row level security;
// alter table appointments disable row level security;
// alter table waitlist disable row level security;
// alter table holidays disable row level security;
// alter table whatsapp_templates disable row level security;
// alter table whatsapp_logs disable row level security;
// alter table public_validations disable row level security;

import React, { useEffect, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

// ------- Supabase client único -------
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseKey) {
  console.warn("⚠️ Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey);

// ------- Tipos básicos -------
type Section =
  | "dashboard"
  | "pacientes"
  | "agenda"
  | "waitlist"
  | "holidays"
  | "whatsapp"
  | "validation"
  | "chat"
  | "medico"
  | "config"
  | "login";

type Patient = {
  id: string;
  name: string;
  cpf: string | null;
  phone: string | null;
  email: string | null;
  birth_date: string | null;
  notes: string | null;
  created_at: string;
};

type Appointment = {
  id: string;
  start_time: string;
  status: string;
  reason: string | null;
  patient_id: string;
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

type Holiday = {
  id: string;
  date: string;
  description: string | null;
  is_blocked: boolean;
};

type WhatsTemplate = {
  id: string;
  name: string;
  content: string;
};

type WhatsLog = {
  id: string;
  phone: string | null;
  message: string | null;
  status: string | null;
  sent_at: string;
};

type ValidationRecord = {
  id: string;
  code: string;
  patient_name: string | null;
  doc_type: string | null;
  doc_url: string | null;
  valid: boolean;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type UserSession = {
  role: "admin" | "medico" | "recepcao";
  name: string;
};

// ------- Base de conhecimento da clínica -------
const CLINIC_KB = `
Você é o assistente oficial da clínica MedIntelli.
Regras:
- Seja objetivo, cordial e profissional.
- Responda sobre agendamentos, retornos, orientações gerais, preparo de exames.
- NÃO dê diagnósticos nem prescrições.
- Em caso de urgência, oriente procurar pronto-atendimento.
- Quando tiver dúvida, sugira falar com a equipe da clínica.
`;

// ------- Componentes de layout -------
function Sidebar(props: {
  active: Section;
  onChange: (s: Section) => void;
  session: UserSession | null;
}) {
  const items: { id: Section; label: string; roles?: UserSession["role"][] }[] =
    [
      { id: "dashboard", label: "Dashboard" },
      { id: "pacientes", label: "Pacientes" },
      { id: "agenda", label: "Agenda" },
      { id: "waitlist", label: "Fila de Espera" },
      { id: "holidays", label: "Feriados/Bloqueios" },
      { id: "whatsapp", label: "Mensagens Automáticas" },
      { id: "validation", label: "Validação Pública" },
      { id: "chat", label: "Chat IA" },
      { id: "medico", label: "Painel Médico" },
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
          marginBottom: 8,
          color: "#1a3f8b",
        }}
      >
        MedIntelli Clínica
      </h2>
      {props.session && (
        <p style={{ fontSize: 12, marginBottom: 16, color: "#333" }}>
          Logado como <strong>{props.session.name}</strong> (
          {props.session.role})
        </p>
      )}
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
        <button
          onClick={() => props.onChange("login")}
          style={{
            marginTop: 16,
            textAlign: "left",
            border: "none",
            padding: "8px 10px",
            borderRadius: 6,
            background: "transparent",
            color: "#c00",
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          Sair / Trocar usuário
        </button>
      </nav>
    </aside>
  );
}

function PageContainer(props: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ fontSize: 22, marginBottom: 12 }}>{props.title}</h1>
      <div>{props.children}</div>
    </div>
  );
}

// ------- Login simples (sem Supabase Auth) -------
function LoginSection(props: {
  onLogin: (session: UserSession) => void;
}) {
  const [user, setUser] = useState({
    email: "",
    password: "",
    role: "admin" as UserSession["role"],
  });
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user.email || !user.password) {
      setError("Informe e-mail e senha (fictícios).");
      return;
    }
    // Aqui pode integrar Supabase Auth futuramente.
    const session: UserSession = {
      role: user.role,
      name: user.email,
    };
    localStorage.setItem("medintelli_clinica_session", JSON.stringify(session));
    props.onLogin(session);
  }

  return (
    <PageContainer title="Login da Clínica">
      <form
        onSubmit={handleSubmit}
        style={{
          maxWidth: 360,
          display: "grid",
          gap: 8,
          padding: 16,
          borderRadius: 8,
          background: "#fff",
          boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
        }}
      >
        <input
          placeholder="E-mail"
          value={user.email}
          onChange={(e) => setUser((p) => ({ ...p, email: e.target.value }))}
          style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
        />
        <input
          type="password"
          placeholder="Senha"
          value={user.password}
          onChange={(e) => setUser((p) => ({ ...p, password: e.target.value }))}
          style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
        />
        <select
          value={user.role}
          onChange={(e) =>
            setUser((p) => ({ ...p, role: e.target.value as UserSession["role"] }))
          }
          style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
        >
          <option value="admin">Administrador</option>
          <option value="medico">Médico</option>
          <option value="recepcao">Recepção</option>
        </select>

        {error && <p style={{ color: "red", fontSize: 12 }}>{error}</p>}

        <button
          type="submit"
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            border: "none",
            background: "#1a73e8",
            color: "#fff",
            cursor: "pointer",
            marginTop: 4,
          }}
        >
          Entrar
        </button>
      </form>
      <p style={{ marginTop: 16, fontSize: 12, color: "#555" }}>
        Neste MVP o login é apenas de sessão local. Para produção, substitua
        por Supabase Auth.
      </p>
    </PageContainer>
  );
}

// ------- Dashboard -------
function DashboardSection() {
  const [counts, setCounts] = useState({
    patients: 0,
    appointments: 0,
    waitlist: 0,
    todayAppointments: 0,
  });

  useEffect(() => {
    async function load() {
      try {
        const [pats, apps, wait, today] = await Promise.all([
          supabase.from("patients").select("id", { count: "exact", head: true }),
          supabase
            .from("appointments")
            .select("id", { count: "exact", head: true }),
          supabase
            .from("waitlist")
            .select("id", { count: "exact", head: true }),
          supabase
            .from("appointments")
            .select("id", { count: "exact", head: true })
            .gte("start_time", new Date().toISOString().slice(0, 10))
            .lte(
              "start_time",
              new Date().toISOString().slice(0, 10) + "T23:59:59Z"
            ),
        ]);

        setCounts({
          patients: pats.count || 0,
          appointments: apps.count || 0,
          waitlist: wait.count || 0,
          todayAppointments: today.count || 0,
        });
      } catch (err) {
        console.error(err);
      }
    }
    load();
  }, []);

  const cardStyle: React.CSSProperties = {
    flex: 1,
    padding: 16,
    borderRadius: 10,
    background: "#fff",
    boxShadow: "0 2px 6px rgba(0,0,0,0.05)",
    minWidth: 160,
  };

  return (
    <PageContainer title="Dashboard">
      <div
        style={{
          display: "flex",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 20,
        }}
      >
        <div style={cardStyle}>
          <h3>Pacientes</h3>
          <p style={{ fontSize: 28, margin: 0 }}>{counts.patients}</p>
        </div>
        <div style={cardStyle}>
          <h3>Consultas totais</h3>
          <p style={{ fontSize: 28, margin: 0 }}>{counts.appointments}</p>
        </div>
        <div style={cardStyle}>
          <h3>Consultas hoje</h3>
          <p style={{ fontSize: 28, margin: 0 }}>{counts.todayAppointments}</p>
        </div>
        <div style={cardStyle}>
          <h3>Fila de espera</h3>
          <p style={{ fontSize: 28, margin: 0 }}>{counts.waitlist}</p>
        </div>
      </div>
      <p>
        Este painel resume o movimento da clínica. Use as abas ao lado para
        gerenciar pacientes, agenda, fila, feriados, WhatsApp e validar
        documentos públicos.
      </p>
    </PageContainer>
  );
}

// ------- Pacientes (CRUD) -------
function PacientesSection() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    cpf: "",
    phone: "",
    email: "",
    birth_date: "",
    notes: "",
  });

  async function loadPatients() {
    setLoading(true);
    const { data, error } = await supabase
      .from("patients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      alert("Erro ao carregar pacientes.");
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

    const payload = {
      name: form.name,
      cpf: form.cpf || null,
      phone: form.phone || null,
      email: form.email || null,
      birth_date: form.birth_date || null,
      notes: form.notes || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from("patients")
        .update(payload)
        .eq("id", editingId);
      if (error) {
        console.error(error);
        alert("Erro ao atualizar paciente.");
      }
    } else {
      const { error } = await supabase.from("patients").insert(payload);
      if (error) {
        console.error(error);
        alert("Erro ao salvar paciente.");
      }
    }

    setForm({
      name: "",
      cpf: "",
      phone: "",
      email: "",
      birth_date: "",
      notes: "",
    });
    setEditingId(null);
    await loadPatients();
  }

  function handleEdit(p: Patient) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      cpf: p.cpf || "",
      phone: p.phone || "",
      email: p.email || "",
      birth_date: p.birth_date || "",
      notes: p.notes || "",
    });
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Excluir paciente? Isso remove agendamentos?")) return;
    const { error } = await supabase.from("patients").delete().eq("id", id);
    if (error) {
      console.error(error);
      alert("Erro ao excluir paciente.");
    } else {
      setPatients((prev) => prev.filter((p) => p.id !== id));
    }
  }

  return (
    <PageContainer title="Pacientes">
      <h3>{editingId ? "Editar paciente" : "Novo paciente"}</h3>
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
        <div style={{ display: "flex", gap: 8 }}>
          <input
            name="cpf"
            value={form.cpf}
            onChange={handleChange}
            placeholder="CPF"
            style={{ flex: 1, padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
          />
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            placeholder="Telefone"
            style={{ flex: 1, padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
          />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="E-mail"
            style={{ flex: 1, padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
          />
          <input
            type="date"
            name="birth_date"
            value={form.birth_date}
            onChange={handleChange}
            style={{ flex: 1, padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
          />
        </div>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          placeholder="Observações"
          rows={2}
          style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
        />
        <div style={{ display: "flex", gap: 8 }}>
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
            {editingId ? "Salvar alterações" : "Salvar paciente"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setEditingId(null);
                setForm({
                  name: "",
                  cpf: "",
                  phone: "",
                  email: "",
                  birth_date: "",
                  notes: "",
                });
              }}
              style={{
                padding: "8px 12px",
                borderRadius: 6,
                border: "1px solid #ccc",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              Cancelar edição
            </button>
          )}
        </div>
      </form>

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
            fontSize: 13,
          }}
        >
          <thead>
            <tr style={{ background: "#e6f0ff" }}>
              <th style={{ border: "1px solid #ccc", padding: 6 }}>Nome</th>
              <th style={{ border: "1px solid #ccc", padding: 6 }}>CPF</th>
              <th style={{ border: "1px solid #ccc", padding: 6 }}>Telefone</th>
              <th style={{ border: "1px solid #ccc", padding: 6 }}>E-mail</th>
              <th style={{ border: "1px solid #ccc", padding: 6 }}>Nascimento</th>
              <th style={{ border: "1px solid #ccc", padding: 6 }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {patients.map((p) => (
              <tr key={p.id}>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>{p.name}</td>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>{p.cpf || "-"}</td>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>
                  {p.phone || "-"}
                </td>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>
                  {p.email || "-"}
                </td>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>
                  {p.birth_date || "-"}
                </td>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>
                  <button onClick={() => handleEdit(p)}>Editar</button>{" "}
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

// ------- Agenda -------
function AgendaSection() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    patient_id: "",
    date: "",
    time: "",
    reason: "",
  });

  async function loadData() {
    setLoading(true);

    const [pats, apps, hols] = await Promise.all([
      supabase.from("patients").select("id,name").order("name"),
      supabase
        .from("appointments")
        .select("id,start_time,status,reason,patient_id,patients(name)")
        .order("start_time"),
      supabase.from("holidays").select("*").order("date"),
    ]);

    if (!pats.error && pats.data) {
      setPatients(pats.data as Patient[]);
    }
    if (!apps.error && apps.data) {
      setAppointments(apps.data as Appointment[]);
    }
    if (!hols.error && hols.data) {
      setHolidays(hols.data as Holiday[]);
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

  function isHoliday(dateStr: string) {
    return holidays.some((h) => h.date === dateStr && h.is_blocked);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.patient_id || !form.date || !form.time) return;

    if (isHoliday(form.date)) {
      if (
        !window.confirm(
          "A data está marcada como feriado/bloqueio. Deseja agendar mesmo assim?"
        )
      ) {
        return;
      }
    }

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
    <PageContainer title="Agenda da Clínica">
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
            style={{ flex: 1, padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
          />
          <input
            type="time"
            name="time"
            value={form.time}
            onChange={handleChange}
            required
            style={{ flex: 1, padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
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
            fontSize: 13,
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

// ------- Fila de Espera -------
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
    <PageContainer title="Fila de Espera Inteligente">
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
            fontSize: 13,
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

// ------- Feriados / Bloqueios -------
function HolidaysSection() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [form, setForm] = useState({
    date: "",
    description: "",
    is_blocked: true,
  });

  async function load() {
    const { data, error } = await supabase
      .from("holidays")
      .select("*")
      .order("date");
    if (error) {
      console.error(error);
      alert("Erro ao carregar feriados.");
    } else {
      setHolidays((data || []) as Holiday[]);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.date) return;
    const { error } = await supabase.from("holidays").insert({
      date: form.date,
      description: form.description || null,
      is_blocked: form.is_blocked,
    });
    if (error) {
      console.error(error);
      alert("Erro ao salvar feriado.");
    } else {
      setForm({ date: "", description: "", is_blocked: true });
      await load();
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Remover feriado/bloqueio?")) return;
    const { error } = await supabase.from("holidays").delete().eq("id", id);
    if (error) {
      console.error(error);
      alert("Erro ao remover.");
    } else {
      setHolidays((prev) => prev.filter((h) => h.id !== id));
    }
  }

  return (
    <PageContainer title="Feriados e Bloqueios de Agenda">
      <form
        onSubmit={handleSubmit}
        style={{
          display: "grid",
          gap: 8,
          maxWidth: 420,
          marginBottom: 16,
        }}
      >
        <input
          type="date"
          value={form.date}
          onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
          required
          style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
        />
        <input
          placeholder="Descrição (ex.: Feriado Municipal)"
          value={form.description}
          onChange={(e) =>
            setForm((p) => ({ ...p, description: e.target.value }))
          }
          style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
        />
        <label style={{ fontSize: 13 }}>
          <input
            type="checkbox"
            checked={form.is_blocked}
            onChange={(e) =>
              setForm((p) => ({ ...p, is_blocked: e.target.checked }))
            }
            style={{ marginRight: 6 }}
          />
          Bloquear agenda neste dia
        </label>
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
          Adicionar feriado/bloqueio
        </button>
      </form>

      <h3>Lista de feriados/bloqueios</h3>
      {holidays.length === 0 ? (
        <p>Nenhum registro.</p>
      ) : (
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            fontSize: 13,
          }}
        >
          <thead>
            <tr style={{ background: "#e6f0ff" }}>
              <th style={{ border: "1px solid #ccc", padding: 6 }}>Data</th>
              <th style={{ border: "1px solid #ccc", padding: 6 }}>
                Descrição
              </th>
              <th style={{ border: "1px solid #ccc", padding: 6 }}>
                Bloqueio
              </th>
              <th style={{ border: "1px solid #ccc", padding: 6 }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {holidays.map((h) => (
              <tr key={h.id}>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>
                  {h.date}
                </td>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>
                  {h.description || "-"}
                </td>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>
                  {h.is_blocked ? "Sim" : "Não"}
                </td>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>
                  <button onClick={() => handleDelete(h.id)}>Remover</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </PageContainer>
  );
}

// ------- Painel Mensagens WhatsApp (config/log) -------
function WhatsappSection() {
  const [templates, setTemplates] = useState<WhatsTemplate[]>([]);
  const [logs, setLogs] = useState<WhatsLog[]>([]);
  const [form, setForm] = useState({ name: "", content: "" });

  async function load() {
    const [t, l] = await Promise.all([
      supabase.from("whatsapp_templates").select("*").order("created_at", {
        ascending: true,
      }),
      supabase
        .from("whatsapp_logs")
        .select("id,phone,message,status,sent_at")
        .order("sent_at", { ascending: false })
        .limit(50),
    ]);

    if (!t.error && t.data) setTemplates(t.data as WhatsTemplate[]);
    if (!l.error && l.data) setLogs(l.data as WhatsLog[]);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.content.trim()) return;
    const { error } = await supabase.from("whatsapp_templates").insert({
      name: form.name,
      content: form.content,
    });
    if (error) {
      console.error(error);
      alert("Erro ao salvar modelo.");
    } else {
      setForm({ name: "", content: "" });
      await load();
    }
  }

  return (
    <PageContainer title="Painel de Mensagens Automáticas (WhatsApp)">
      <p style={{ fontSize: 13, marginBottom: 10 }}>
        Aqui você cadastra os modelos de mensagens que serão usados em
        integrações (WhatsApp, SMS, e-mail). O envio automático pode ser
        implementado depois, consumindo estas tabelas.
      </p>

      <h3>Novo modelo</h3>
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
          value={form.name}
          onChange={(e) =>
            setForm((p) => ({ ...p, name: e.target.value }))
          }
          placeholder="Nome do modelo (ex.: Confirmação de consulta)"
          style={{ padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
        />
        <textarea
          value={form.content}
          onChange={(e) =>
            setForm((p) => ({ ...p, content: e.target.value }))
          }
          placeholder="Conteúdo da mensagem..."
          rows={3}
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
          Salvar modelo
        </button>
      </form>

      <h3>Modelos cadastrados</h3>
      {templates.length === 0 ? (
        <p>Nenhum modelo cadastrado.</p>
      ) : (
        <ul style={{ paddingLeft: 16, fontSize: 13 }}>
          {templates.map((t) => (
            <li key={t.id} style={{ marginBottom: 6 }}>
              <strong>{t.name}:</strong> {t.content}
            </li>
          ))}
        </ul>
      )}

      <h3 style={{ marginTop: 16 }}>Últimos envios registrados</h3>
      {logs.length === 0 ? (
        <p>Nenhum envio registrado (integração futura).</p>
      ) : (
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            fontSize: 12,
          }}
        >
          <thead>
            <tr style={{ background: "#e6f0ff" }}>
              <th style={{ border: "1px solid #ccc", padding: 6 }}>Telefone</th>
              <th style={{ border: "1px solid #ccc", padding: 6 }}>
                Mensagem
              </th>
              <th style={{ border: "1px solid #ccc", padding: 6 }}>Status</th>
              <th style={{ border: "1px solid #ccc", padding: 6 }}>
                Data/Hora
              </th>
            </tr>
          </thead>
          <tbody>
            {logs.map((l) => (
              <tr key={l.id}>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>
                  {l.phone}
                </td>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>
                  {l.message}
                </td>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>
                  {l.status}
                </td>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>
                  {new Date(l.sent_at).toLocaleString("pt-BR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </PageContainer>
  );
}

// ------- Validação Pública -------
function ValidationSection() {
  const [code, setCode] = useState("");
  const [record, setRecord] = useState<ValidationRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    setRecord(null);

    const { data, error } = await supabase
      .from("public_validations")
      .select("*")
      .eq("code", code.trim())
      .maybeSingle();

    if (error) {
      console.error(error);
      setError("Erro ao consultar validação.");
    } else if (!data) {
      setError("Código não encontrado.");
    } else {
      setRecord(data as ValidationRecord);
    }

    setLoading(false);
  }

  return (
    <PageContainer title="Tela de Validação Pública">
      <p style={{ fontSize: 13, marginBottom: 8 }}>
        Esta tela pode ser disponibilizada em um site público para validar
        atestados, laudos, receitas e outros documentos emitidos pela clínica.
      </p>

      <form
        onSubmit={handleSearch}
        style={{
          display: "flex",
          gap: 8,
          maxWidth: 420,
          marginBottom: 12,
        }}
      >
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Digite o código do documento"
          style={{ flex: 1, padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "8px 12px",
            borderRadius: 6,
            border: "none",
            background: "#1a73e8",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Consultar
        </button>
      </form>

      {loading && <p>Consultando...</p>}
      {error && <p style={{ color: "red", fontSize: 13 }}>{error}</p>}

      {record && (
        <div
          style={{
            marginTop: 12,
            padding: 12,
            borderRadius: 8,
            background: "#f2f9ff",
            border: "1px solid #c6ddff",
            maxWidth: 520,
          }}
        >
          <p>
            <strong>Código:</strong> {record.code}
          </p>
          <p>
            <strong>Paciente:</strong> {record.patient_name || "-"}
          </p>
          <p>
            <strong>Tipo de documento:</strong> {record.doc_type || "-"}
          </p>
          <p>
            <strong>Situação:</strong>{" "}
            {record.valid ? "Documento VÁLIDO" : "Documento INVÁLIDO/REVOGADO"}
          </p>
          {record.doc_url && (
            <p>
              <a href={record.doc_url} target="_blank">
                Abrir documento
              </a>
            </p>
          )}
        </div>
      )}
    </PageContainer>
  );
}

// ------- Chat IA da Clínica -------
function ChatSection() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Olá! Sou o assistente virtual da clínica MedIntelli. Como posso ajudar?",
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
          { role: "system" as const, content: CLINIC_KB },
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
      <p style={{ fontSize: 13, color: "#555", marginBottom: 10 }}>
        Use este chat para respostas rápidas de atendimento, orientações gerais
        e apoio à recepção. Não substitui decisão médica.
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

// ------- Painel Médico (simplificado) -------
function MedicoSection() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const today = new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from("appointments")
      .select("id,start_time,status,reason,patients(name)")
      .gte("start_time", today)
      .lte("start_time", today + "T23:59:59Z")
      .order("start_time");
    if (error) {
      console.error(error);
      alert("Erro ao carregar agenda do médico.");
    } else {
      setAppointments((data || []) as Appointment[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <PageContainer title="Painel do Médico - Hoje">
      {loading ? (
        <p>Carregando...</p>
      ) : appointments.length === 0 ? (
        <p>Sem consultas para hoje.</p>
      ) : (
        <table
          style={{
            borderCollapse: "collapse",
            width: "100%",
            fontSize: 13,
          }}
        >
          <thead>
            <tr style={{ background: "#e6f0ff" }}>
              <th style={{ border: "1px solid #ccc", padding: 6 }}>Paciente</th>
              <th style={{ border: "1px solid #ccc", padding: 6 }}>
                Horário
              </th>
              <th style={{ border: "1px solid #ccc", padding: 6 }}>Status</th>
              <th style={{ border: "1px solid #ccc", padding: 6 }}>Motivo</th>
            </tr>
          </thead>
          <tbody>
            {appointments.map((a) => (
              <tr key={a.id}>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>
                  {a.patients?.name || "-"}
                </td>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>
                  {new Date(a.start_time).toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>
                  {a.status}
                </td>
                <td style={{ border: "1px solid #ccc", padding: 6 }}>
                  {a.reason || "-"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </PageContainer>
  );
}

// ------- Configurações -------
function ConfigSection() {
  return (
    <PageContainer title="Configurações da Clínica">
      <p>
        Nesta versão, as principais configurações ficam em variáveis de
        ambiente e no Supabase:
      </p>
      <ul>
        <li>🔑 <strong>Supabase</strong>: URL e ANON KEY (VITE_SUPABASE_*)</li>
        <li>🤖 <strong>OpenAI</strong>: VITE_OPENAI_API_KEY</li>
        <li>🗄️ Tabelas: patients, appointments, waitlist, holidays, etc.</li>
        <li>
          📲 Integrações de WhatsApp/SMS: a serem implementadas usando as
          tabelas de templates e logs.
        </li>
      </ul>
      <p style={{ marginTop: 8 }}>
        Ajustes visuais podem ser feitos diretamente neste arquivo App.tsx, em
        cada seção.
      </p>
    </PageContainer>
  );
}

// ------- App principal -------
export default function App() {
  const [section, setSection] = useState<Section>("dashboard");
  const [session, setSession] = useState<UserSession | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem("medintelli_clinica_session");
    if (raw) {
      try {
        setSession(JSON.parse(raw));
      } catch {
        // ignore
      }
    } else {
      setSection("login");
    }
  }, []);

  function handleLogin(s: UserSession) {
    setSession(s);
    setSection("dashboard");
  }

  return (
    <div style={{ display: "flex", fontFamily: "system-ui, sans-serif" }}>
      {session && (
        <Sidebar
          active={section}
          onChange={setSection}
          session={session}
        />
      )}
      <div
        style={{
          flex: 1,
          background: "#f5f5f5",
          minHeight: "100vh",
        }}
      >
        {!session || section === "login" ? (
          <LoginSection onLogin={handleLogin} />
        ) : (
          <>
            {section === "dashboard" && <DashboardSection />}
            {section === "pacientes" && <PacientesSection />}
            {section === "agenda" && <AgendaSection />}
            {section === "waitlist" && <WaitlistSection />}
            {section === "holidays" && <HolidaysSection />}
            {section === "whatsapp" && <WhatsappSection />}
            {section === "validation" && <ValidationSection />}
            {section === "chat" && <ChatSection />}
            {section === "medico" && <MedicoSection />}
            {section === "config" && <ConfigSection />}
          </>
        )}
      </div>
    </div>
  );
}

