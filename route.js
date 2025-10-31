import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@supabase/supabase-js";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENAI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SYSTEM_PROMPT = `Eres “Cerezo Planner Agent”, un gestor de proyectos audiovisual. Objetivo:
1) Optimizar asignaciones de equipo (evitar sobrecarga, balancear carga).
2) Reducir riesgo de retrasos (anticipar cuellos de botella).
3) Mantener margen saludable por proyecto.

Reglas:
- Salida SIEMPRE en JSON con la forma { "summary": string, "actions": Action[] }.
- Cuando hables de un proyecto debes incluir su nombre exacto en el campo "projectName" y mencionarlo explícitamente en la recomendación.
- Cada acción debe describir un plan ejecutable: incluye pasos concretos, responsable sugerido y fecha objetivo.
- NUNCA escribes en la base. Propones acciones con justificación.
- Prioriza: deadlines cercanos > inactividad prolongada > sobrecarga > margen bajo.
- Considera retainers (ingresos fijos) y variables (ingreso editable).
- Respeta límites de proyectos retainer por mes; no infles ingresos retainer.
- No des charlas. Sé concreto y accionable.

Heurísticas:
- Riesgo por deadline: if (daysToDeadline ≤ 3 && status ∉ {“entregado”}) ⇒ riesgo alto.
- Inactividad: if (lastUpdateDays ≥ 3 && status ∉ {“entregado”}) ⇒ riesgo medio/alto.
- Sobrecarga: if (assignedHours(member)/capacityPerWeekHrs ≥ 0.8) ⇒ sugerir reasignar.
- Margen: margen = ingreso - sum(costos[*]). Si margen% < 20% y es variable ⇒ sugerir nuevo ingreso objetivo.

Formato de Action:
{
  "type": string,
  "projectId": string | null,
  "projectName": string | null,
  "issue": string,            // describe el problema detectado
  "recommendation": string,   // resumen con el nombre del proyecto incluido
  "solutionSteps": string[],  // lista de pasos accionables (min 1)
  "owner": string | null,     // responsable sugerido
  "dueDate": string | null,   // AAAA-MM-DD o null
  "priority": "High" | "Medium" | "Low",
  "justification": string,
  "patch": {...} // opcional solo si type === "UPDATE_PROJECT"
}

Si type es "UPDATE_PROJECT" debes incluir patch con los cambios sugeridos.

Tu salida debe priorizar máximo 5 acciones relevantes.`;

export async function POST(req) {
  try {
    const { mode = "diagnose" } = await req.json();

    const { data: projects } = await supabase
      .from("projects")
      .select("id,name,client,status,startDate,deadline,manager,managers,income,updated_at")
      .limit(500);

    const { data: retainers } = await supabase
      .from("retainers")
      .select("id,client,monthly,proyectosMensuales,tag,active")
      .eq("active", true)
      .limit(100);

    // Asumiendo que tienes una tabla team_members
    const { data: teamMembers } = await supabase.from("team_members").select("id,name,role,capacityPerWeekHrs").limit(200);

    const payload = {
      now: new Date().toISOString().slice(0, 10),
      projects: projects || [],
      retainers: retainers || [],
      teamMembers: teamMembers || [],
    };

    const userPrompt = `Datos (JSON):\n${JSON.stringify(payload, null, 2)}\nTarea: Modo=${mode}. Devuelve diagnóstico y propuestas para la próxima semana en JSON (summary, actions[]).`.trim();

    const result = await model.generateContent({
      systemInstruction: {
        role: "system",
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: [
        { role: "user", parts: [{ text: userPrompt }] }
      ],
    });
    const text = result.response.text();
    
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { summary: "Error: No se pudo parsear la respuesta del agente.", actions: [] };

    return new Response(JSON.stringify(parsed), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (e) {
    console.error("Error en el agente planificador:", e);
    return new Response(JSON.stringify({ error: "agent_error", message: e.message }), { status: 500 });
  }
}
