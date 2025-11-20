// src/App.tsx – MedIntelli Clínica V3
// Layout tipo ERP (igual PDF), com:
// - Dashboard
// - Pacientes (CRUD)
// - Agenda (FullCalendar)
// - Fila de Espera
// - Central Clínica (WhatsApp + IA)
// - Configurações

import React, { useEffect, useMemo, useState } from "react";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin, { DateClickArg } from "@fullcalendar/interaction";

// =============================
//  SUPABASE CLIENT
// =============================

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env
  .VITE_SUPABASE_ANON_KEY as string | undefined;

let supabase: SupabaseClient | null = null;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("⚠️ Configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.");
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

// =============================
//  TIPOS
// =============================

type Section =
  | "dashboard"
  | "pacientes"
  | "agenda"
  | "waitlist"
  | "central"
  | "config";

type Patient = {
  id: string;
  name: string;
  phone: string | null;
  birth_date: string | null;
  document: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
};

type Appointment = {
  id: string;
  patient_id: string;
  start_time: string;
  end_time: string | null;
  status: string;
  reason: string | null;
  created_at: string;
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

type MessageCenter = {
  id: string;
  sender: string;
  sender_name: string | null;
  phone: string | null;
  message: string;
  direction: "in" | "out";
  channel: "whatsapp" | "app" | "interno";
  category: string | null;
  created_at: string;
};

type MessageCategory = {
  id: number;
  name: string;
  color: string | null;
  description: string | null;
};

// =============================
//  LAYOUT (ERP STYLE)
// =============================

function AppShell(props: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900">
      <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-md bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
            M
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm">MedIntelli Clínica</span>
            <span className="text-xs text-slate-500">
              Painel de Gestão e Central de Mensagens
            </span>
          </div>
        </div>
        <div className="text-xs text-slate-500">
          V3.0 • Ambiente Clínica • {new Date().toLocaleDateString("pt-BR")}
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">{props.children}</div>
    </div>
  );
}

function Sidebar(props: {
  active: Section;
  onChange: (s: Section) => void;
}) {
  const items: { id: Section; label: string }[] = [
    { id: "dashboard", label: "Dashboard" },
    { id: "pacientes", label: "Pacientes" },
    { id: "agenda", label: "Agenda" },
    { id: "waitlist", label: "Fila de Espera" },
    { id: "central", label: "Central Clínica" },
    { id: "config", label: "Configurações" },
  ];

  return (
    <aside className="w-60 bg-slate-950 text-slate-100 flex flex-col">
      <div className="px-4 py-3 border-b border-slate-800 text-xs text-slate-400">
        Menu Principal
      </div>
      <nav className="flex-1 py-2">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => props.onChange(item.id)}
            className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-800 transition ${
              props.active === item.id ? "bg-slate-800 font-semibold" : ""
            }`}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-slate-800 text-[11px] text-slate-500">
        Usuário: <span className="font-semibold">Clínica MedIntelli</span>
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
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="border-b border-slate-200 bg-white px-6 py-3">
        <h1 className="text-lg font-semibold">{props.title}</h1>
        {props.subtitle && (
          <p className="text-xs text-slate-500 mt-1">{props.subtitle}</p>
        )}
      </div>
      <div className="flex-1 overflow-auto p-4">{props.children}</div>
    </div>
  );
}

// =============================
//  DASHBOARD
// =============================

function DashboardSection() {
  return (
    <PageShell
      title="Dashboard Geral"
      subtitle="Visão geral da operação da clínica"
    >
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500">Pacientes</div>
          <div className="text-2xl font-semibold mt-1">—</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Total cadastrado (carregado na aba Pacientes)
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500">Consultas Hoje</div>
          <div className="text-2xl font-semibold mt-1">—</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Visualize na aba Agenda.
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500">Fila de Espera</div>
          <div className="text-2xl font-semibold mt-1">—</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Gerencie em Fila de Espera.
          </div>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-3">
          <div className="text-xs text-slate-500">Mensagens Recentes</div>
          <div className="text-2xl font-semibold mt-1">—</div>
          <div className="text-[11px] text-slate-400 mt-1">
            Atenda pela Central Clínica.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4 text-sm">
          <h2 className="font-semibold mb-2">Fluxo operacional sugerido</h2>
          <ol className="list-decimal list-inside text-xs space-y-1 text-slate-600">
            <li>Cadastrar pacientes na aba Pacientes.</li>
            <li>Agendar consultas na aba Agenda (FullCalendar).</li>
            <li>Usar Fila de Espera para encaixes e sobras.</li>
            <li>
              Atender WhatsApp / App Paciente pela aba Central Clínica, com IA.
            </li>
          </ol>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4 text-sm">
          <h2 className="font-semibold mb-2">Observações</h2>
          <p className="text-xs text-slate-600">
            Este painel é um resumo. O foco do uso diário será:
          </p>
          <ul className="list-disc list-inside text-xs text-slate-600 mt-1">
            <li>Agenda (consulta de horários)</li>
            <li>Central Clínica (mensagens e WhatsApp)</li>
            <li>Fila de Espera (encaixes)</li>
          </ul>
        </div>
      </div>
    </PageShell>
  );
}

// =============================
//  PACIENTES
// =============================

function PacientesSection() {
  const [list, setList] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [form, setForm] = useState({
    name: "",
    phone: "",
    birth_date: "",
    document: "",
    email: "",
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
      setList((data || []) as Patient[]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadPatients();
  }, []);

  function handleChange(
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement
    >
  ) {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    if (!form.name.trim()) return;

    setSaving(true);
    setError("");

    const { error } = await supabase.from("patients").insert({
      name: form.name,
      phone: form.phone || null,
      birth_date: form.birth_date || null,
      document: form.document || null,
      email: form.email || null,
      notes: form.notes || null,
    });

    if (error) {
      console.error(error);
      setError("Erro ao salvar paciente.");
    } else {
      setForm({
        name: "",
        phone: "",
        birth_date: "",
        document: "",
        email: "",
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
      setList((prev) => prev.filter((p) => p.id !== id));
    }
  }

  return (
    <PageShell
      title="Cadastro de Pacientes"
      subtitle="Cadastro e consulta de pacientes da clínica"
    >
      <div className="grid grid-cols-[360px,1fr] gap-4">
        {/* Formulário */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 text-sm">
          <h2 className="font-semibold mb-3 text-sm">
            Novo paciente / Edição simples
          </h2>
          <form className="space-y-2" onSubmit={handleSubmit}>
            <div>
              <label className="text-xs text-slate-600">Nome *</label>
              <input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                className="w-full border rounded-md px-2 py-1 text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-600">Telefone</label>
                <input
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  className="w-full border rounded-md px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">Nascimento</label>
                <input
                  type="date"
                  name="birth_date"
                  value={form.birth_date}
                  onChange={handleChange}
                  className="w-full border rounded-md px-2 py-1 text-sm"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-600">Documento</label>
                <input
                  name="document"
                  value={form.document}
                  onChange={handleChange}
                  className="w-full border rounded-md px-2 py-1 text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">E-mail</label>
                <input
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  className="w-full border rounded-md px-2 py-1 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-600">Observações</label>
              <textarea
                name="notes"
                value={form.notes}
                onChange={handleChange}
                rows={3}
                className="w-full border rounded-md px-2 py-1 text-sm"
              />
            </div>
            {error && (
              <div className="text-xs text-red-600">{error}</div>
            )}
            <button
              type="submit"
              disabled={saving || !supabase}
              className="px-3 py-2 bg-blue-600 text-white rounded-md text-xs hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Salvando..." : "Salvar paciente"}
            </button>
          </form>
        </div>

        {/* Lista */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 text-xs">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-sm">Lista de pacientes</h2>
            <button
              onClick={loadPatients}
              className="px-2 py-1 text-[11px] border rounded-md"
            >
              Atualizar
            </button>
          </div>
          {loading ? (
            <p className="text-slate-500 text-xs">Carregando...</p>
          ) : list.length === 0 ? (
            <p className="text-slate-500 text-xs">
              Nenhum paciente cadastrado.
            </p>
          ) : (
            <div className="overflow-auto max-h-[70vh]">
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-200 px-2 py-1 text-left">
                      Nome
                    </th>
                    <th className="border border-slate-200 px-2 py-1 text-left">
                      Telefone
                    </th>
                    <th className="border border-slate-200 px-2 py-1">
                      Nasc.
                    </th>
                    <th className="border border-slate-200 px-2 py-1">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((p) => (
                    <tr key={p.id}>
                      <td className="border border-slate-200 px-2 py-1">
                        {p.name}
                      </td>
                      <td className="border border-slate-200 px-2 py-1">
                        {p.phone || "-"}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-center">
                        {p.birth_date || "-"}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-center">
                        <button
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

// =============================
//  AGENDA (FULLCALENDAR)
// =============================

function AgendaSection() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    patient_id: "",
    date: "",
    time: "",
    duration: 30,
    reason: "",
  });

  async function loadData() {
    if (!supabase) return;
    setLoading(true);

    const [pats, apps] = await Promise.all([
      supabase.from("patients").select("id,name").order("name"),
      supabase
        .from("appointments")
        .select("id,patient_id,start_time,end_time,status,reason,patients(name)")
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
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    if (!form.patient_id || !form.date || !form.time) return;

    const start = new Date(`${form.date}T${form.time}:00`);
    const end = new Date(start.getTime() + form.duration * 60000);

    const { error } = await supabase.from("appointments").insert({
      patient_id: form.patient_id,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      reason: form.reason || null,
      status: "agendado",
    });

    if (error) {
      console.error(error);
      alert("Erro ao agendar.");
    } else {
      setForm({
        patient_id: "",
        date: "",
        time: "",
        duration: 30,
        reason: "",
      });
      await loadData();
    }
  }

  function mapEvents() {
    return appointments.map((a) => {
      const patientName = a.patients?.name || "Paciente";
      const title = `${patientName} (${a.status})`;
      return {
        id: a.id,
        title,
        start: a.start_time,
        end: a.end_time || undefined,
      };
    });
  }

  function handleDateClick(arg: DateClickArg) {
    const d = arg.date;
    const dateStr = d.toISOString().substring(0, 10);
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    setForm((f) => ({
      ...f,
      date: dateStr,
      time: `${hours}:${minutes}`,
    }));
  }

  return (
    <PageShell
      title="Agenda da Clínica"
      subtitle="Visualização de consultas em formato calendário"
    >
      <div className="grid grid-cols-[320px,1fr] gap-4">
        {/* Formulário de agendamento */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 text-sm">
          <h2 className="font-semibold mb-3 text-sm">
            Novo agendamento rápido
          </h2>
          <form className="space-y-2" onSubmit={handleSubmit}>
            <div>
              <label className="text-xs text-slate-600">
                Paciente *
              </label>
              <select
                name="patient_id"
                value={form.patient_id}
                onChange={handleChange}
                required
                className="w-full border rounded-md px-2 py-1 text-sm"
              >
                <option value="">Selecione...</option>
                {patients.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-600">Data *</label>
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  className="w-full border rounded-md px-2 py-1 text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-slate-600">Hora *</label>
                <input
                  type="time"
                  name="time"
                  value={form.time}
                  onChange={handleChange}
                  className="w-full border rounded-md px-2 py-1 text-sm"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-600">
                Duração (minutos)
              </label>
              <input
                type="number"
                name="duration"
                value={form.duration}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    duration: Number(e.target.value || 30),
                  }))
                }
                className="w-full border rounded-md px-2 py-1 text-sm"
                min={10}
                max={180}
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">
                Motivo / Observações
              </label>
              <input
                name="reason"
                value={form.reason}
                onChange={handleChange}
                className="w-full border rounded-md px-2 py-1 text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={!supabase}
              className="px-3 py-2 bg-blue-600 text-white rounded-md text-xs hover:bg-blue-700 disabled:opacity-50"
            >
              Agendar
            </button>
          </form>
        </div>

        {/* Calendário */}
        <div className="bg-white rounded-lg border border-slate-200 p-3 text-xs">
          {loading ? (
            <p className="text-slate-500 text-xs">
              Carregando agenda...
            </p>
          ) : (
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              locale="pt-br"
              height="75vh"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth,timeGridWeek,timeGridDay",
              }}
              events={mapEvents()}
              dateClick={handleDateClick}
            />
          )}
        </div>
      </div>
    </PageShell>
  );
}

// =============================
//  FILA DE ESPERA
// =============================

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
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("waitlist")
      .select("*")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      alert("Erro ao carregar fila.");
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
    setForm((f) => ({ ...f, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    if (!form.patient_name.trim()) return;

    const { error } = await supabase.from("waitlist").insert({
      patient_name: form.patient_name,
      phone: form.phone || null,
      reason: form.reason || null,
      priority: Number(form.priority) || 1,
    });

    if (error) {
      console.error(error);
      alert("Erro ao adicionar à fila.");
    } else {
      setForm({
        patient_name: "",
        phone: "",
        reason: "",
        priority: "1",
      });
      await loadList();
    }
  }

  async function handleRemove(id: string) {
    if (!supabase) return;
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
    <PageShell
      title="Fila de Espera"
      subtitle="Gestão de encaixes e sobras de agenda"
    >
      <div className="grid grid-cols-[320px,1fr] gap-4">
        {/* Form */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 text-sm">
          <h2 className="font-semibold mb-3 text-sm">
            Adicionar à fila de espera
          </h2>
          <form className="space-y-2" onSubmit={handleSubmit}>
            <div>
              <label className="text-xs text-slate-600">
                Nome do paciente *
              </label>
              <input
                name="patient_name"
                value={form.patient_name}
                onChange={handleChange}
                className="w-full border rounded-md px-2 py-1 text-sm"
                required
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">Telefone</label>
              <input
                name="phone"
                value={form.phone}
                onChange={handleChange}
                className="w-full border rounded-md px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">
                Motivo / Observações
              </label>
              <textarea
                name="reason"
                value={form.reason}
                onChange={handleChange}
                rows={2}
                className="w-full border rounded-md px-2 py-1 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-slate-600">Prioridade</label>
              <select
                name="priority"
                value={form.priority}
                onChange={handleChange}
                className="w-full border rounded-md px-2 py-1 text-sm"
              >
                <option value="1">Normal</option>
                <option value="2">Preferencial</option>
              </select>
            </div>
            <button
              type="submit"
              disabled={!supabase}
              className="px-3 py-2 bg-blue-600 text-white rounded-md text-xs hover:bg-blue-700 disabled:opacity-50"
            >
              Adicionar à fila
            </button>
          </form>
        </div>

        {/* Lista */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 text-xs">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold text-sm">Fila atual</h2>
            <button
              onClick={loadList}
              className="px-2 py-1 text-[11px] border rounded-md"
            >
              Atualizar
            </button>
          </div>
          {loading ? (
            <p className="text-slate-500 text-xs">Carregando...</p>
          ) : items.length === 0 ? (
            <p className="text-slate-500 text-xs">
              Nenhum paciente na fila.
            </p>
          ) : (
            <div className="overflow-auto max-h-[70vh]">
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="border border-slate-200 px-2 py-1 text-left">
                      Paciente
                    </th>
                    <th className="border border-slate-200 px-2 py-1">
                      Telefone
                    </th>
                    <th className="border border-slate-200 px-2 py-1">
                      Motivo
                    </th>
                    <th className="border border-slate-200 px-2 py-1">
                      Prioridade
                    </th>
                    <th className="border border-slate-200 px-2 py-1">
                      Entrada
                    </th>
                    <th className="border border-slate-200 px-2 py-1">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((i) => (
                    <tr key={i.id}>
                      <td className="border border-slate-200 px-2 py-1">
                        {i.patient_name}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-center">
                        {i.phone || "-"}
                      </td>
                      <td className="border border-slate-200 px-2 py-1">
                        {i.reason || "-"}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-center">
                        {i.priority === 2
                          ? "Preferencial"
                          : "Normal"}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-center">
                        {new Date(
                          i.created_at
                        ).toLocaleString("pt-BR")}
                      </td>
                      <td className="border border-slate-200 px-2 py-1 text-center">
                        <button
                          onClick={() => handleRemove(i.id)}
                          className="text-blue-600 hover:underline"
                        >
                          Atender / Remover
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

// =============================
//  CENTRAL CLÍNICA (WHATSAPP + IA)
// =============================

function CentralClinicaSection() {
  const [messages, setMessages] = useState<MessageCenter[]>([]);
  const [categories, setCategories] = useState<MessageCategory[]>([]);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState({
    channel: "todos",
    category: "todos",
    search: "",
  });

  const [selectedPhone, setSelectedPhone] = useState<string | null>(
    null
  );
  const [chatMessages, setChatMessages] = useState<MessageCenter[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState("");
  const [classifying, setClassifying] = useState(false);

  async function loadBase() {
    if (!supabase) return;
    setLoading(true);

    const [msgs, cats] = await Promise.all([
      supabase
        .from("messages_center")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("message_categories")
        .select("*")
        .order("id", { ascending: true }),
    ]);

    if (!msgs.error && msgs.data) {
      setMessages(msgs.data as MessageCenter[]);
    }
    if (!cats.error && cats.data) {
      setCategories(cats.data as MessageCategory[]);
    }

    setLoading(false);
  }

  async function openChat(phone: string) {
    if (!supabase) return;
    setSelectedPhone(phone);

    const { data, error } = await supabase
      .from("messages_center")
      .select("*")
      .eq("phone", phone)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setChatMessages(data as MessageCenter[]);
      await generateAISuggestion(data as MessageCenter[]);
    }
  }

  async function sendReply() {
    if (!supabase || !selectedPhone || !input.trim()) return;
    setSending(true);

    const text = input;
    setInput("");

    // 1) Grava no Supabase
    const { error } = await supabase.from("messages_center").insert({
      sender: "clinica",
      sender_name: "Atendente",
      phone: selectedPhone,
      message: text,
      direction: "out",
      channel: "whatsapp",
      category: "resposta",
    });

    if (error) {
      console.error(error);
      alert("Erro ao salvar resposta.");
    } else {
      // 2) Envia via AVISA API (se chave estiver configurada)
      const avisaKey = import.meta.env.VITE_AVISA_API_KEY as
        | string
        | undefined;
      if (avisaKey) {
        try {
          await fetch("https://api.avisa.app/send-message", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${avisaKey}`,
            },
            body: JSON.stringify({
              phone: selectedPhone,
              message: text,
            }),
          });
        } catch (e) {
          console.error("Erro ao chamar AVISA API:", e);
        }
      }

      await openChat(selectedPhone);
      await loadBase();
    }

    setSending(false);
  }

  async function generateAISuggestion(chat: MessageCenter[]) {
    const lastUserMessage = [...chat]
      .reverse()
      .find((m) => m.direction === "in");
    if (!lastUserMessage) {
      setAiSuggestion("");
      return;
    }

    const apiKey = import.meta.env.VITE_OPENAI_API_KEY as
      | string
      | undefined;
    if (!apiKey) {
      setAiSuggestion(
        "Configure VITE_OPENAI_API_KEY para usar a sugestão da IA."
      );
      return;
    }

    try {
      const payload = {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system" as const,
            content: `
Você é o assistente da Central Clínica MedIntelli.
Responda de forma educada, sucinta, sem diagnosticar.
Sugira algo que um atendente humano poderia enviar pelo WhatsApp.`,
          },
          {
            role: "user" as const,
            content: lastUserMessage.message,
          },
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

      const data = await resp.json();
      const answer =
        data.choices?.[0]?.message?.content ||
        "Não foi possível gerar sugestão.";
      setAiSuggestion(answer);
    } catch (e) {
      console.error(e);
      setAiSuggestion(
        "Erro ao chamar IA. Verifique a chave VITE_OPENAI_API_KEY."
      );
    }
  }

  async function classifyWithAI(msg: MessageCenter) {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY as
      | string
      | undefined;
    if (!apiKey || !supabase) {
      alert(
        "Configure VITE_OPENAI_API_KEY para usar classificação automática."
      );
      return;
    }

    setClassifying(true);

    try {
      const nomesCategorias = categories.map((c) => c.name).join(", ");
      const payload = {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system" as const,
            content: `
Você é um classificador de mensagens para clínica médica.
Escolha UMA categoria entre: ${nomesCategorias}.
Responda APENAS com o nome exato da categoria, sem explicações.`,
          },
          {
            role: "user" as const,
            content: msg.message,
          },
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
      const data = await resp.json();
      const category =
        (data.choices?.[0]?.message?.content as string) ||
        "informações";

      await supabase
        .from("messages_center")
        .update({ category })
        .eq("id", msg.id);

      await loadBase();
      if (selectedPhone) await openChat(selectedPhone);
    } catch (e) {
      console.error(e);
      alert("Erro ao classificar com IA.");
    }

    setClassifying(false);
  }

  const filtered = useMemo(() => {
    return messages.filter((m) => {
      const matchChannel =
        filter.channel === "todos" ||
        m.channel.toLowerCase() === filter.channel;
      const matchCategory =
        filter.category === "todos" ||
        (m.category || "").toLowerCase() ===
          filter.category.toLowerCase();
      const matchSearch =
        filter.search.trim() === "" ||
        m.message
          .toLowerCase()
          .includes(filter.search.toLowerCase()) ||
        (m.phone || "").includes(filter.search);

      return matchChannel && matchCategory && matchSearch;
    });
  }, [messages, filter]);

  // Agrupar por telefone (última mensagem)
  const groupedByPhone = useMemo(() => {
    const map = new Map<string, MessageCenter>();
    for (const m of filtered) {
      const key = m.phone || m.sender;
      if (!map.has(key)) {
        map.set(key, m);
      }
    }
    return Array.from(map.values());
  }, [filtered]);

  useEffect(() => {
    loadBase();
  }, []);

  return (
    <PageShell
      title="Central Clínica"
      subtitle="Atendimento unificado (WhatsApp + App Paciente) com apoio de IA"
    >
      <div className="grid grid-cols-[300px,1.4fr,0.9fr] gap-4 h-[78vh]">
        {/* COLUNA 1 – FILTROS + LISTA DE CONTATOS */}
        <div className="bg-white rounded-lg border border-slate-200 flex flex-col text-xs">
          <div className="border-b border-slate-200 p-3">
            <div className="font-semibold text-sm mb-2">
              Filtros
            </div>
            <input
              placeholder="Buscar por texto ou telefone..."
              value={filter.search}
              onChange={(e) =>
                setFilter((f) => ({
                  ...f,
                  search: e.target.value,
                }))
              }
              className="w-full border rounded-md px-2 py-1 text-xs mb-2"
            />
            <select
              value={filter.channel}
              onChange={(e) =>
                setFilter((f) => ({
                  ...f,
                  channel: e.target.value,
                }))
              }
              className="w-full border rounded-md px-2 py-1 text-xs mb-2"
            >
              <option value="todos">Todos os canais</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="app">App Paciente</option>
              <option value="interno">Interno</option>
            </select>
            <select
              value={filter.category}
              onChange={(e) =>
                setFilter((f) => ({
                  ...f,
                  category: e.target.value,
                }))
              }
              className="w-full border rounded-md px-2 py-1 text-xs"
            >
              <option value="todos">Todas categorias</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              onClick={loadBase}
              className="mt-2 w-full border rounded-md px-2 py-1 text-[11px]"
            >
              Atualizar
            </button>
          </div>

          <div className="flex-1 overflow-auto">
            {loading ? (
              <p className="p-3 text-slate-500 text-xs">
                Carregando mensagens...
              </p>
            ) : groupedByPhone.length === 0 ? (
              <p className="p-3 text-slate-500 text-xs">
                Nenhuma conversa encontrada.
              </p>
            ) : (
              groupedByPhone.map((m) => {
                const cat = categories.find(
                  (c) => c.name === m.category
                );
                return (
                  <button
                    key={m.id}
                    onClick={() =>
                      openChat(m.phone || m.sender)
                    }
                    className={`w-full text-left px-3 py-2 border-b border-slate-200 hover:bg-slate-100 ${
                      selectedPhone === (m.phone || m.sender)
                        ? "bg-slate-100"
                        : ""
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-semibold text-[11px]">
                        {m.sender_name ||
                          m.phone ||
                          m.sender}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(
                          m.created_at
                        ).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                    </div>
                    <div className="text-[11px] text-slate-600 truncate">
                      {m.message}
                    </div>
                    {cat && (
                      <div className="mt-1 text-[10px]">
                        <span
                          className="px-1.5 py-0.5 rounded-full text-white"
                          style={{
                            backgroundColor:
                              cat.color || "#1a73e8",
                          }}
                        >
                          {cat.name}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* COLUNA 2 – CHAT */}
        <div className="bg-white rounded-lg border border-slate-200 flex flex-col text-xs">
          <div className="border-b border-slate-200 px-4 py-2 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="font-semibold text-sm">
                {selectedPhone || "Selecione um contato"}
              </span>
              <span className="text-[11px] text-slate-500">
                Histórico da conversa
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-auto bg-slate-50 p-3">
            {!selectedPhone ? (
              <p className="text-slate-500 text-xs">
                Selecione um contato na coluna à esquerda.
              </p>
            ) : chatMessages.length === 0 ? (
              <p className="text-slate-500 text-xs">
                Nenhuma mensagem ainda.
              </p>
            ) : (
              chatMessages.map((m) => (
                <div
                  key={m.id}
                  className={`mb-1 flex ${
                    m.direction === "out"
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`px-3 py-2 rounded-xl max-w-[70%] whitespace-pre-wrap text-[11px] ${
                      m.direction === "out"
                        ? "bg-blue-600 text-white"
                        : "bg-white border border-slate-200 text-slate-800"
                    }`}
                  >
                    {m.message}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-slate-200 px-3 py-2">
            {selectedPhone && aiSuggestion && (
              <div className="mb-2 text-[11px] bg-yellow-50 border border-yellow-200 rounded-md p-2 text-slate-700">
                <strong>Sugestão da IA:</strong> {aiSuggestion}
              </div>
            )}
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Digite uma resposta..."
                className="flex-1 border rounded-md px-2 py-1 text-xs"
              />
              <button
                onClick={sendReply}
                disabled={sending || !selectedPhone}
                className="px-3 py-1 bg-blue-600 text-white rounded-md text-xs hover:bg-blue-700 disabled:opacity-50"
              >
                Enviar
              </button>
            </div>
          </div>
        </div>

        {/* COLUNA 3 – DETALHES / CLASSIFICAÇÃO */}
        <div className="bg-white rounded-lg border border-slate-200 flex flex-col text-xs">
          <div className="border-b border-slate-200 px-3 py-2">
            <div className="font-semibold text-sm mb-1">
              Detalhes da conversa
            </div>
            <p className="text-[11px] text-slate-500">
              Classificação manual ou por IA.
            </p>
          </div>
          <div className="flex-1 overflow-auto p-3">
            {selectedPhone ? (
              <>
                <div className="mb-3">
                  <div className="text-[11px] text-slate-500">
                    Telefone
                  </div>
                  <div className="font-semibold text-sm">
                    {selectedPhone}
                  </div>
                </div>
                <div className="mb-3">
                  <div className="text-[11px] text-slate-500">
                    Categoria atual (última mensagem)
                  </div>
                  {(() => {
                    const last = [...chatMessages].reverse()[0];
                    if (!last || !last.category)
                      return (
                        <div className="text-[11px] text-slate-400">
                          Não categorizado
                        </div>
                      );
                    const cat = categories.find(
                      (c) => c.name === last.category
                    );
                    return (
                      <div className="mt-1">
                        <span
                          className="px-2 py-1 rounded-full text-white text-[11px]"
                          style={{
                            backgroundColor:
                              cat?.color || "#1a73e8",
                          }}
                        >
                          {last.category}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {chatMessages.length > 0 && (
                  <div className="mb-3">
                    <div className="text-[11px] text-slate-500 mb-1">
                      Classificar última mensagem com IA
                    </div>
                    <button
                      disabled={classifying}
                      onClick={() =>
                        classifyWithAI(
                          chatMessages[chatMessages.length - 1]
                        )
                      }
                      className="px-3 py-1 bg-slate-900 text-white rounded-md text-[11px] hover:bg-slate-800 disabled:opacity-50"
                    >
                      {classifying
                        ? "Classificando..."
                        : "Classificar pela IA"}
                    </button>
                  </div>
                )}

                <div className="mt-4 border-t border-slate-200 pt-3">
                  <div className="text-[11px] text-slate-500 mb-1">
                    Observação
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Você pode usar esta tela apenas como painel
                    operacional. A inteligência de classificação e
                    sugestão já está ativa nesta versão básica.
                  </p>
                </div>
              </>
            ) : (
              <p className="text-slate-500 text-xs">
                Selecione uma conversa para ver detalhes.
              </p>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

// =============================
//  CONFIGURAÇÕES
// =============================

function ConfigSection() {
  return (
    <PageShell
      title="Configurações"
      subtitle="Informações técnicas para implantação"
    >
      <div className="grid grid-cols-2 gap-4 text-xs">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h2 className="font-semibold mb-2 text-sm">
            Integrações ativas
          </h2>
          <ul className="list-disc list-inside text-slate-600 space-y-1">
            <li>Supabase (Banco de dados, Realtime, Edge Functions)</li>
            <li>WhatsApp via AVISA API (Webhook + envio)</li>
            <li>OpenAI (IA para respostas e classificação)</li>
            <li>FullCalendar (Agenda visual tipo Google Calendar)</li>
          </ul>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <h2 className="font-semibold mb-2 text-sm">
            Variáveis de ambiente necessárias
          </h2>
          <ul className="list-disc list-inside text-slate-600 space-y-1">
            <li>VITE_SUPABASE_URL</li>
            <li>VITE_SUPABASE_ANON_KEY</li>
            <li>VITE_OPENAI_API_KEY</li>
            <li>VITE_AVISA_API_KEY (opcional, para enviar pelo WhatsApp)</li>
          </ul>
        </div>
      </div>
    </PageShell>
  );
}

// =============================
//  APP PRINCIPAL
// =============================

export default function App() {
  const [section, setSection] = useState<Section>("dashboard");

  return (
    <AppShell>
      <Sidebar active={section} onChange={setSection} />
      {section === "dashboard" && <DashboardSection />}
      {section === "pacientes" && <PacientesSection />}
      {section === "agenda" && <AgendaSection />}
      {section === "waitlist" && <WaitlistSection />}
      {section === "central" && <CentralClinicaSection />}
      {section === "config" && <ConfigSection />}
    </AppShell>
  );
}
