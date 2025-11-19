
// src/App.tsx - MedIntelli Clínica V3
// --------------------------------------------------
// Requisitos:
// - Variáveis de ambiente no Vercel:
//   VITE_SUPABASE_URL
//   VITE_SUPABASE_ANON_KEY
//   VITE_OPENAI_API_KEY
//
// - Tabelas usadas (já criadas):
//   patients
//   appointments_full
//   waitlist_full
//   messages_center
//   clinic_users
//   documents
//   medical_notes
//   settings
//
// --------------------------------------------------

import React, {
  useEffect,
  useState,
  ChangeEvent,
  FormEvent,
} from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

// --------------------------------------------------
// Supabase client
// --------------------------------------------------
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseKey) {
  console.warn("⚠️ Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
}

const supabase: SupabaseClient | null =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// --------------------------------------------------
// Tipos
// --------------------------------------------------

type Section =
  | "dashboard"
  | "patients"
  | "agenda"
  | "waitlist"
  | "messages"
  | "chat"
  | "config";

type UserRole = "A" | "B" | "C";

type Patient = {
  id: string;
  name: string;
  cpf?: string | null;
  phone?: string | null;
  birth_date?: string | null;
  notes?: string | null;
  created_at?: string;
};

type AppointmentFull = {
  id: string;
  patient_id: string | null;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  status: string;
  patients?: { name: string } | null;
};

type WaitlistFull = {
  id: string;
  patient_name: string;
  phone: string | null;
  priority: number;
  reason: string | null;
  status: string;
  created_at: string;
};

type MessageCenter = {
  id: string;
  sender: string;
  sender_name: string | null;
  phone: string | null;
  message: string;
  direction: "in" | "out" | string;
  channel: string;
  created_at: string;
};

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

// --------------------------------------------------
// Base de conhecimento da clínica (Chat IA)
// --------------------------------------------------

const CLINIC_KNOWLEDGE = `
Você é o assistente virtual da clínica MedIntelli.

Regras importantes:
- Seja educado, objetivo e profissional.
- Ajude com: agendamentos, horários, retornos, orientações gerais de rotina.
- NÃO faça diagnóstico médico nem prescrição.
- Em caso de febre alta, dor intensa, falta de ar, perda de consciência, ou sintomas agudos, oriente procurar pronto atendimento imediatamente.
- Para dúvidas específicas sobre tratamento, exames ou laudos, oriente falar com o médico responsável.

A clínica trabalha com:
- Consultas eletivas
- Retornos
- Exames complementares
- Acompanhamentos de rotina
`;

// --------------------------------------------------
// Componentes de layout
// --------------------------------------------------

function Sidebar(props: {
  active: Section;
  onChange: (s: Section) => void;
}) {
  const items: { id: Section; label: string }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "patients", label: "Pacientes" },
    { id: "agenda", label: "Agenda" },
    { id: "waitlist", label: "Fila de Espera" },
    { id: "messages", label: "Central Clínica" },
    { id: "chat", label: "Chat IA" },
    { id: "config", label: "Configurações" },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-50 flex flex-col">
      <div className="px-5 py-4 border-b border-slate-800">
        <div className="font-bold text-lg">MedIntelli Clínica</div>
        <p className="text-xs text-slate-300 mt-1">
          Painel administrativo V3
        </p>
      </div>
      <nav className="flex-1 overflow-y-auto py-3">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => props.onChange(item.id)}
            className={`w-full text-left px-4 py-2 text-sm transition ${
              props.active === item.id
                ? "bg-slate-700 text-white"
                : "text-slate-200 hover:bg-slate-800"
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-slate-800 text-[11px] text-slate-400">
        MedIntelli Basic • V3.0
      </div>
    </aside>
  );
}

function PageShell(props: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 min-h-screen bg-slate-100">
      <header className="bg-white border-b border-slate-200 px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">
            {props.title}
          </h1>
          {props.subtitle && (
            <p className="text-xs text-slate-500 mt-1">{props.subtitle}</p>
          )}
        </div>
      </header>
      <main className="px-8 py-6">{props.children}</main>
    </div>
  );
}

// --------------------------------------------------
// DASHBOARD
// --------------------------------------------------

function DashboardSection() {
  return (
    <PageShell
      title="Visão geral"
      subtitle="Resumo rápido do funcionamento da clínica."
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Pacientes</p>
          <p className="text-2xl font-semibold mt-1">Cadastro simples</p>
          <p className="text-xs text-slate-500 mt-1">
            Cadastro e listagem com dados básicos.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Agenda</p>
          <p className="text-2xl font-semibold mt-1">FullCalendar</p>
          <p className="text-xs text-slate-500 mt-1">
            Agenda visual com status por cor.
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <p className="text-xs text-slate-500">Central</p>
          <p className="text-2xl font-semibold mt-1">Mensagens</p>
          <p className="text-xs text-slate-500 mt-1">
            Histórico básico de mensagens via WhatsApp / App.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 text-sm text-slate-700">
        <p className="mb-2 font-medium">Como usar a versão V3:</p>
        <ol className="list-decimal list-inside space-y-1">
          <li>
            Cadastre pacientes em <strong>Pacientes</strong>.
          </li>
          <li>
            Agende consultas em <strong>Agenda</strong> (FullCalendar).
          </li>
          <li>
            Controle encaixes pela <strong>Fila de Espera</strong>.
          </li>
          <li>
            Acompanhe conversas em <strong>Central Clínica</strong>.
          </li>
          <li>
            Use o <strong>Chat IA</strong> para dúvidas rápidas.
          </li>
        </ol>
      </div>
    </PageShell>
  );
}

// --------------------------------------------------
// PACIENTES (CRUD simples)
// --------------------------------------------------

function PatientsSection() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");

  const [form, setForm] = useState({
    name: "",
    cpf: "",
    phone: "",
    birth_date: "",
    notes: "",
  });

  async function loadPatients() {
    if (!supabase) return;
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
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
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
    if (!supabase) return;
    if (!window.confirm("Deseja realmente excluir este paciente?")) return;
    const { error } = await supabase.from("patients").delete().eq("id", id);
    if (error) {
      console.error(error);
      alert("Erro ao excluir paciente.");
    } else {
      setPatients((prev) => prev.filter((p) => p.id !== id));
    }
  }

  return (
    <PageShell
      title="Pacientes"
      subtitle="Cadastro básico de pacientes com dados essenciais."
    >
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">
            Novo paciente
          </h2>
          <form className="space-y-2" onSubmit={handleSubmit}>
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Nome *"
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                name="cpf"
                value={form.cpf}
                onChange={handleChange}
                placeholder="CPF"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                placeholder="Telefone"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>
            <input
              type="date"
              name="birth_date"
              value={form.birth_date}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="Observações"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar paciente"}
            </button>
            {error && (
              <p className="text-xs text-red-600 mt-1">{error}</p>
            )}
          </form>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">
            Lista de pacientes
          </h2>
          {loading ? (
            <p className="text-xs text-slate-500">Carregando...</p>
          ) : patients.length === 0 ? (
            <p className="text-xs text-slate-500">
              Nenhum paciente cadastrado.
            </p>
          ) : (
            <div className="max-h-[420px] overflow-y-auto">
              <table className="min-w-full text-xs">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-2 py-1 text-left font-semibold text-slate-600">
                      Nome
                    </th>
                    <th className="px-2 py-1 text-left font-semibold text-slate-600">
                      Telefone
                    </th>
                    <th className="px-2 py-1 text-left font-semibold text-slate-600">
                      CPF
                    </th>
                    <th className="px-2 py-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((p) => (
                    <tr
                      key={p.id}
                      className="border-t border-slate-100"
                    >
                      <td className="px-2 py-1">{p.name}</td>
                      <td className="px-2 py-1">
                        {p.phone || <span className="text-slate-400">-</span>}
                      </td>
                      <td className="px-2 py-1">
                        {p.cpf || <span className="text-slate-400">-</span>}
                      </td>
                      <td className="px-2 py-1 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id)}
                          className="text-red-600 hover:underline"
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}

// --------------------------------------------------
// AGENDA (FullCalendar + appointments_full)
// --------------------------------------------------

function AgendaSection() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    patient_id: "",
    title: "",
    date: "",
    time: "",
    duration: "30", // minutos
    description: "",
  });

  async function loadData() {
    if (!supabase) return;
    setLoading(true);

    const [pats, apps] = await Promise.all([
      supabase.from("patients").select("id,name").order("name"),
      supabase
        .from("appointments_full")
        .select("id,title,description,start_time,end_time,status,patients(name)")
        .order("start_time", { ascending: true }),
    ]);

    if (!pats.error && pats.data) {
      setPatients(pats.data as Patient[]);
    }

    if (!apps.error && apps.data) {
      const mapped = (apps.data as AppointmentFull[]).map((a) => ({
        id: a.id,
        title: a.title || a.patients?.name || "Consulta",
        start: a.start_time,
        end: a.end_time || undefined,
        extendedProps: {
          status: a.status,
          patientName: a.patients?.name,
          description: a.description,
        },
      }));
      setEvents(mapped);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    if (!form.patient_id || !form.date || !form.time) return;

    const start = new Date(`${form.date}T${form.time}:00`);
    const durationMinutes = Number(form.duration) || 30;
    const end = new Date(start.getTime() + durationMinutes * 60000);

    const { error } = await supabase.from("appointments_full").insert({
      patient_id: form.patient_id,
      title:
        form.title ||
        patients.find((p) => p.id === form.patient_id)?.name ||
        "Consulta",
      description: form.description || null,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      status: "agendado",
    });

    if (error) {
      console.error(error);
      alert("Erro ao agendar consulta.");
      return;
    }

    setForm({
      patient_id: "",
      title: "",
      date: "",
      time: "",
      duration: "30",
      description: "",
    });

    await loadData();
  }

  function eventClass(status?: string) {
    switch (status) {
      case "confirmado":
        return "bg-emerald-500 border-emerald-500";
      case "cancelado":
        return "bg-red-500 border-red-500";
      case "concluido":
        return "bg-slate-500 border-slate-500";
      default:
        return "bg-blue-500 border-blue-500";
    }
  }

  return (
    <PageShell
      title="Agenda"
      subtitle="Agenda visual com FullCalendar."
    >
      <div className="grid lg:grid-cols-[340px,1fr] gap-6">
        {/* Formulário lateral */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">
            Novo agendamento
          </h2>

          <form className="space-y-2" onSubmit={handleSubmit}>
            <select
              name="patient_id"
              value={form.patient_id}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            >
              <option value="">Selecione o paciente</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <input
              name="title"
              value={form.title}
              onChange={handleChange}
              placeholder="Título (opcional)"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />

            <div className="grid grid-cols-[1.2fr,1fr] gap-2">
              <input
                type="date"
                name="date"
                value={form.date}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
              <input
                type="time"
                name="time"
                value={form.time}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
              />
            </div>

            <select
              name="duration"
              value={form.duration}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            >
              <option value="20">20 min</option>
              <option value="30">30 min</option>
              <option value="40">40 min</option>
              <option value="60">60 min</option>
            </select>

            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              placeholder="Motivo / observações"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />

            <button
              type="submit"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
            >
              Agendar
            </button>
          </form>

          {loading && (
            <p className="text-xs text-slate-500 mt-2">Carregando agenda...</p>
          )}
        </div>

        {/* Calendário */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridWeek"
            locale="pt-br"
            slotMinTime="07:00:00"
            slotMaxTime="20:00:00"
            height="78vh"
            events={events}
            eventClassNames={(arg) =>
              `text-xs text-white border ${eventClass(
                arg.event.extendedProps.status
              )}`
            }
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
          />
        </div>
      </div>
    </PageShell>
  );
}

// --------------------------------------------------
// FILA DE ESPERA (waitlist_full)
// --------------------------------------------------

function WaitlistSection() {
  const [items, setItems] = useState<WaitlistFull[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    patient_name: "",
    phone: "",
    priority: "1",
    reason: "",
  });

  async function loadList() {
    if (!supabase) return;
    setLoading(true);

    const { data, error } = await supabase
      .from("waitlist_full")
      .select("*")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      alert("Erro ao carregar fila de espera.");
    } else {
      setItems((data || []) as WaitlistFull[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadList();
  }, []);

  function handleChange(
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    if (!form.patient_name.trim()) return;

    const { error } = await supabase.from("waitlist_full").insert({
      patient_name: form.patient_name,
      phone: form.phone || null,
      priority: Number(form.priority) || 1,
      reason: form.reason || null,
      status: "aguardando",
    });

    if (error) {
      console.error(error);
      alert("Erro ao adicionar à fila.");
      return;
    }

    setForm({
      patient_name: "",
      phone: "",
      priority: "1",
      reason: "",
    });

    await loadList();
  }

  async function handleAtender(id: string) {
    if (!supabase) return;
    const { error } = await supabase
      .from("waitlist_full")
      .update({ status: "atendido" })
      .eq("id", id);
    if (error) {
      console.error(error);
      alert("Erro ao atualizar.");
      return;
    }
    await loadList();
  }

  async function handleRemover(id: string) {
    if (!supabase) return;
    const { error } = await supabase
      .from("waitlist_full")
      .delete()
      .eq("id", id);
    if (error) {
      console.error(error);
      alert("Erro ao remover da fila.");
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  return (
    <PageShell
      title="Fila de espera"
      subtitle="Controle de encaixes e prioridades."
    >
      <div className="grid lg:grid-cols-[340px,1fr] gap-6">
        {/* Formulário */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">
            Adicionar à fila
          </h2>
          <form className="space-y-2" onSubmit={handleSubmit}>
            <input
              name="patient_name"
              value={form.patient_name}
              onChange={handleChange}
              placeholder="Nome do paciente *"
              required
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="Telefone"
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
            <select
              name="priority"
              value={form.priority}
              onChange={handleChange}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            >
              <option value="1">Normal</option>
              <option value="2">Prioridade</option>
            </select>
            <textarea
              name="reason"
              value={form.reason}
              onChange={handleChange}
              placeholder="Motivo / Observações"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm"
            />
            <button
              type="submit"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
            >
              Adicionar à fila
            </button>
          </form>
        </div>

        {/* Lista */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-800 mb-3">
            Fila atual
          </h2>
          {loading ? (
            <p className="text-xs text-slate-500">Carregando...</p>
          ) : items.length === 0 ? (
            <p className="text-xs text-slate-500">Fila vazia.</p>
          ) : (
            <div className="max-h-[460px] overflow-y-auto text-xs">
              <table className="min-w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-2 py-1 text-left">Paciente</th>
                    <th className="px-2 py-1 text-left">Fone</th>
                    <th className="px-2 py-1 text-left">Prioridade</th>
                    <th className="px-2 py-1 text-left">Status</th>
                    <th className="px-2 py-1 text-left">Entrada</th>
                    <th className="px-2 py-1 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr
                      key={i.id}
                      className="border-t border-slate-100"
                    >
                      <td className="px-2 py-1">{i.patient_name}</td>
                      <td className="px-2 py-1">
                        {i.phone || <span className="text-slate-400">-</span>}
                      </td>
                      <td className="px-2 py-1">
                        {i.priority === 2 ? "Prioridade" : "Normal"}
                      </td>
                      <td className="px-2 py-1 capitalize">
                        {i.status || "aguardando"}
                      </td>
                      <td className="px-2 py-1">
                        {new Date(i.created_at).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-2 py-1 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => handleAtender(i.id)}
                          className="text-emerald-600 hover:underline"
                        >
                          Atender
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemover(i.id)}
                          className="text-slate-500 hover:underline"
                        >
                          Remover
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageShell>
  );
}

// --------------------------------------------------
// CENTRAL CLÍNICA (messages_center)
// --------------------------------------------------

function MessagesSection() {
  const [messages, setMessages] = useState<MessageCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterChannel, setFilterChannel] = useState<string>("todos");

  async function loadMessages() {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("messages_center")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error(error);
      alert("Erro ao carregar mensagens da central.");
    } else {
      setMessages((data || []) as MessageCenter[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadMessages();
  }, []);

  const filtered = messages.filter((m) =>
    filterChannel === "todos"
      ? true
      : m.channel.toLowerCase() === filterChannel
  );

  return (
    <PageShell
      title="Central Clínica"
      subtitle="Histórico básico de mensagens (WhatsApp / App / Outros)."
    >
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 text-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="space-x-2">
            <button
              type="button"
              onClick={() => setFilterChannel("todos")}
              className={`px-3 py-1 rounded-full border ${
                filterChannel === "todos"
                  ? "bg-slate-900 text-white border-slate-900"
                  : "border-slate-300 text-slate-600"
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setFilterChannel("whatsapp")}
              className={`px-3 py-1 rounded-full border ${
                filterChannel === "whatsapp"
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "border-slate-300 text-slate-600"
              }`}
            >
              WhatsApp
            </button>
            <button
              type="button"
              onClick={() => setFilterChannel("app")}
              className={`px-3 py-1 rounded-full border ${
                filterChannel === "app"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-slate-300 text-slate-600"
              }`}
            >
              App Paciente
            </button>
          </div>
          <button
            type="button"
            onClick={loadMessages}
            className="px-3 py-1 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50"
          >
            Atualizar
          </button>
        </div>

        {loading ? (
          <p className="text-slate-500">Carregando...</p>
        ) : filtered.length === 0 ? (
          <p className="text-slate-500">
            Nenhuma mensagem encontrada para o filtro atual.
          </p>
        ) : (
          <div className="max-h-[520px] overflow-y-auto space-y-2">
            {filtered.map((m) => (
              <div
                key={m.id}
                className="border border-slate-200 rounded-lg px-3 py-2 flex gap-3 bg-slate-50"
              >
                <div className="w-32 text-[11px] text-slate-500">
                  <div>
                    {new Date(m.created_at).toLocaleDateString("pt-BR")}
                  </div>
                  <div>
                    {new Date(m.created_at).toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                  <div className="mt-1">
                    {m.channel.toLowerCase() === "whatsapp" && (
                      <span className="inline-flex px-2 py-0.5 rounded-full bg-emerald-600/10 text-emerald-700 border border-emerald-600/30">
                        WhatsApp
                      </span>
                    )}
                    {m.channel.toLowerCase() === "app" && (
                      <span className="inline-flex px-2 py-0.5 rounded-full bg-blue-600/10 text-blue-700 border border-blue-600/30">
                        App
                      </span>
                    )}
                    {m.channel.toLowerCase() !== "whatsapp" &&
                      m.channel.toLowerCase() !== "app" && (
                        <span className="inline-flex px-2 py-0.5 rounded-full bg-slate-600/10 text-slate-700 border border-slate-600/30">
                          {m.channel}
                        </span>
                      )}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <div className="text-[11px] text-slate-600">
                      <strong>{m.sender_name || m.sender}</strong>
                      {m.phone && (
                        <span className="ml-2 text-slate-500">
                          ({m.phone})
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {m.direction === "in" ? "⬅️ Entrada" : "➡️ Saída"}
                    </div>
                  </div>
                  <div className="text-[12px] text-slate-800 whitespace-pre-wrap">
                    {m.message}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageShell>
  );
}

// --------------------------------------------------
// CHAT IA
// --------------------------------------------------

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

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const updated = [...messages, { role: "user" as const, content: input }];
    setMessages(updated);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
      if (!apiKey) {
        setError("VITE_OPENAI_API_KEY não configurado.");
        setLoading(false);
        return;
      }

      const payload = {
        model: "gpt-4o-mini",
        messages: [
          { role: "system" as const, content: CLINIC_KNOWLEDGE },
          ...updated,
        ],
      };

      const resp = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!resp.ok) {
        throw new Error("Erro API OpenAI: " + resp.status);
      }

      const data = await resp.json();
      const answer =
        data.choices?.[0]?.message?.content ||
        "Desculpe, não consegui responder agora.";

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: String(answer) },
      ]);
    } catch (err) {
      console.error(err);
      setError("Erro ao conversar com a IA. Verifique a chave da OpenAI.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell
      title="Chat IA da clínica"
      subtitle="Assistente com base de conhecimento da MedIntelli."
    >
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
        <div className="border border-slate-200 rounded-lg p-3 h-80 overflow-y-auto text-sm bg-slate-50">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`mb-2 flex ${
                m.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`px-3 py-2 rounded-2xl max-w-[80%] whitespace-pre-wrap ${
                  m.role === "user"
                    ? "bg-blue-600 text-white"
                    : "bg-white text-slate-800 border border-slate-200"
                }`}
              >
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <p className="text-xs text-slate-500 mt-1">
              IA está respondendo...
            </p>
          )}
        </div>

        {error && (
          <p className="text-xs text-red-600 mt-2">{error}</p>
        )}

        <form
          onSubmit={handleSend}
          className="mt-3 flex gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Digite sua pergunta..."
            className="flex-1 px-3 py-2 rounded-lg border border-slate-300 text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            Enviar
          </button>
        </form>
      </div>
    </PageShell>
  );
}

// --------------------------------------------------
// CONFIGURAÇÕES (apenas informativo por enquanto)
// --------------------------------------------------

function ConfigSection() {
  return (
    <PageShell
      title="Configurações"
      subtitle="Informações técnicas básicas da instalação."
    >
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 text-sm text-slate-700 space-y-2">
        <p>
          <strong>Ambiente:</strong> Vercel + Supabase + Tailwind + FullCalendar.
        </p>
        <p>
          <strong>Tabelas principais:</strong> patients, appointments_full,
          waitlist_full, messages_center, clinic_users, documents, medical_notes,
          settings.
        </p>
        <p>
          <strong>Integração WhatsApp (AVISA API):</strong> permanece em outras
          tabelas <span className="font-mono text-xs">whatsapp_*</span>, que não
          foram alteradas.
        </p>
        <p className="text-xs text-slate-500">
          Obs.: Qualquer erro 400/401 vindo do Supabase geralmente está ligado
          a RLS ou coluna inexistente. Nesta versão, as políticas de RLS foram
          desativadas para simplificar até a fase de testes.
        </p>
      </div>
    </PageShell>
  );
}

// --------------------------------------------------
// APP PRINCIPAL
// --------------------------------------------------

export default function App() {
  const [section, setSection] = useState<Section>("dashboard");

  if (!supabase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-50 text-sm">
        Configure as variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar active={section} onChange={setSection} />
      {section === "dashboard" && <DashboardSection />}
      {section === "patients" && <PatientsSection />}
      {section === "agenda" && <AgendaSection />}
      {section === "waitlist" && <WaitlistSection />}
      {section === "messages" && <MessagesSection />}
      {section === "chat" && <ChatSection />}
      {section === "config" && <ConfigSection />}
    </div>
  );
}
