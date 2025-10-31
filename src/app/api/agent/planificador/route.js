import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY);
const GEMINI_MODEL =
  process.env.GOOGLE_GENAI_MODEL ||
  process.env.NEXT_PUBLIC_GOOGLE_GENAI_MODEL ||
  "gemini-2.5-flash";

const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

const SYSTEM_PROMPT = `Eres Cerezo Planner Agent.

Tu función es analizar proyectos audiovisuales en producción y postproducción para garantizar flujo saludable.

REGLAS OPERATIVAS:
1) SIEMPRE menciona los proyectos por nombre y cliente.
2) Distingue fases:
   - grabación → antes del rodaje
   - postproducción → edición interna
   - revisión → esperando feedback del cliente
   - correcciones → ajustes tras feedback
3) Regla interna para clientes RETAINER con etiqueta "carbono":
   - La entrega de edición debe ocurrir entre 24h y 48h después de la grabación.
   - Si la edición excede ese rango, marca el proyecto como riesgo alto.
4) Nunca hables en abstracto. Cada recomendación debe referirse a proyectos y personas específicas.
5) Si un proyecto con 'state: "grabacion"' tiene una 'recording_date' que ya pasó (comparado con 'now'), tu acción DEBE ser transformar el proyecto. La recomendación debe ser "Convertir a fase de edición", cambiando el 'state' a 'edicion', asignando 'startDate' al día siguiente de 'recording_date' y calculando un 'deadline' apropiado.
5) No des discursos. Sé compacto, táctico y accionable.

FORMATO DE RESPUESTA:
{
  "summary": "Mapa general de próxima semana.",
  "actions": [
    {
      "project": "Nombre del proyecto",
      "client": "Cliente",
      "phase": "grabación | edición | revisión | correcciones",
      "issue": "Qué está pasando",
      "recommendation": "Acción concreta",
      "justification": "Por qué esta acción mejora flujo"
    }
  ]
}

CRITERIOS DE ALERTA:
- Grabaciones y entregas el mismo día → riesgo crítico.
- Más de 2 ciclos de corrección → riesgo de desgaste.
- Editores por encima del 80% de carga semanal → reasignación necesaria.`;

export async function POST(req) {
  try {
    const {
      mode = "diagnose",
      projects: fallbackProjects = [],
      retainers: fallbackRetainers = [],
      teamMembers: fallbackTeam = [],
    } = await req.json();

    const { data: projectsData } = await supabase
      .from("projects")
      .select("id,name,client,status,stage,startDate,deadline,manager,managers,income,updated_at,properties")
      .limit(500);

    const { data: retainersData } = await supabase
      .from("retainers")
      .select("id,client,monthly,proyectosMensuales,tag,active")
      .eq("active", true)
      .limit(100);

    const { data: teamMembersData } = await supabase
      .from("team_members")
      .select("id,name,role,capacityPerWeekHrs")
      .limit(200);
    const { data: revisionCyclesData } = await supabase.from("revision_cycles").select("project_id");

    const projects = Array.isArray(projectsData) && projectsData.length > 0 ? projectsData : fallbackProjects;
    const retainers = Array.isArray(retainersData) && retainersData.length > 0 ? retainersData : fallbackRetainers;
    const teamMembers = Array.isArray(teamMembersData) && teamMembersData.length > 0 ? teamMembersData : fallbackTeam;

    console.info("[Agent] datasets", {
      projectsFromSupabase: projectsData?.length ?? 0,
      retainersFromSupabase: retainersData?.length ?? 0,
      teamMembersFromSupabase: teamMembersData?.length ?? 0,
      fallbackProjects: fallbackProjects?.length ?? 0,
      fallbackRetainers: fallbackRetainers?.length ?? 0,
      fallbackTeamMembers: fallbackTeam?.length ?? 0,
      usingFallbackProjects: projects === fallbackProjects,
      usingFallbackRetainers: retainers === fallbackRetainers,
      usingFallbackTeam: teamMembers === fallbackTeam,
    });

    const payload = {
      now: new Date().toISOString().slice(0, 10),
      projects: (projects || []).map((p) => {
        const isCarbono = p.client?.toLowerCase() === "carbono";
        const cycleCount = (revisionCyclesData || []).filter((c) => c.project_id === p.id).length;

        return {
          project_id: p.id,
          project_name: p.name,
          client: p.client,
          state: p.status?.toLowerCase() || p.stage?.toLowerCase() || "desconocido",
          recording_date: p.properties?.fechaGrabacion || p.startDate,
          editing_deadline_estimated_hours: isCarbono ? 48 : 72, // Ejemplo
          cycle_count: cycleCount,
          assigned_to: p.manager || (Array.isArray(p.managers) ? p.managers.join(", ") : "N/A"),
          client_type: isCarbono ? "carbono" : "variable",
          last_updated: p.updated_at,
        };
      }),
      retainers: retainers || [],
      teamMembers: teamMembers || [],
    };

    const userPrompt = `Datos (JSON):\n${JSON.stringify(payload, null, 2)}\nTarea: Modo=${mode}. Devuelve diagnóstico y propuestas para la próxima semana en JSON (summary, actions[]).`.trim();

    const generateRequest = {
      contents: [
        {
          role: "user",
          parts: [{ text: `${SYSTEM_PROMPT}\n\n${userPrompt}` }],
        },
      ],
    };

    const result = await model.generateContent(generateRequest);
    const text = result.response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: "Error: No se pudo parsear la respuesta del agente.", actions: [] };

    return new Response(JSON.stringify(parsed), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Error en el agente planificador:", e);
    const message =
      e?.status === 404
        ? `El modelo "${GEMINI_MODEL}" no está disponible para esta versión de la API. Ajusta la variable de entorno GOOGLE_GENAI_MODEL a uno de los modelos soportados, por ejemplo: gemini-2.5-flash o gemini-1.5-pro-latest.`
        : e.message;
    return new Response(JSON.stringify({ error: "agent_error", message }), { status: e?.status || 500 });
  }
}
