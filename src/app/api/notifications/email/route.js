import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { requireTeamMember } from '../../../../lib/auth/teamAuth';
import { MEMBER_BY_EMAIL } from '../../../../constants/team';

// Solo se avisa al equipo: antes cualquiera podía usar esta ruta para mandar
// correos a cualquier dirección desde notificaciones@cerezoperu.com.
const TEAM_EMAILS = new Set(Object.keys(MEMBER_BY_EMAIL));

// Los datos del proyecto vienen del cliente: se escapan antes de armar el HTML.
const escapeHtml = (value) =>
  (value ?? '')
    .toString()
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const safeUrl = (value) => {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : '';
  } catch {
    return '';
  }
};

export async function POST(request) {
  const auth = await requireTeamMember(request);
  if (auth.response) return auth.response;

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.error('[notifications] RESEND_API_KEY no está configurada en este entorno.');
    return NextResponse.json(
      {
        code: 'EMAIL_NOT_CONFIGURED',
        message: 'El envío de correos no está configurado (falta RESEND_API_KEY).',
      },
      { status: 503 }
    );
  }

  const resend = new Resend(apiKey);

  try {
    const body = await request.json();
    const { to, subject, projectName, client, dateLabel, dateValue, location, time, calendarLink } = body;

    if (!to) {
      return NextResponse.json({ code: 'MISSING_RECIPIENT', message: 'Falta el destinatario.' }, { status: 400 });
    }
    if (!TEAM_EMAILS.has(to.toString().trim().toLowerCase())) {
      return NextResponse.json({ code: 'RECIPIENT_NOT_ALLOWED', message: 'Solo se puede avisar a integrantes del equipo.' }, { status: 403 });
    }

    const calendarHref = safeUrl(calendarLink);

    const { data, error } = await resend.emails.send({
      from: 'Cerezo Planner <notificaciones@cerezoperu.com>',
      to: [to],
      subject: (subject || '').toString().slice(0, 200),
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #f0f0f0; border-radius: 24px;">
          <h1 style="font-size: 24px; color: #1a1a1a; margin-bottom: 8px;">Nuevo Proyecto Asignado</h1>
          <p style="color: #666; font-size: 14px; margin-bottom: 32px;">Se te ha designado como responsable del siguiente proyecto en Cerezo.</p>

          <div style="background-color: #f9f9f9; padding: 24px; border-radius: 16px; margin-bottom: 32px;">
            <div style="margin-bottom: 16px;">
              <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; color: #999;">Proyecto</span>
              <div style="font-size: 18px; font-weight: 600; color: #1a1a1a;">${escapeHtml(projectName)}</div>
            </div>

            <div style="margin-bottom: 16px;">
              <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; color: #999;">Cliente</span>
              <div style="font-size: 16px; color: #333;">${escapeHtml(client)}</div>
            </div>

            <div style="margin-bottom: 16px;">
              <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; color: #999;">${escapeHtml(dateLabel)}</span>
              <div style="font-size: 16px; color: #333;">${escapeHtml(dateValue)} ${time ? `— ${escapeHtml(time)}` : ''}</div>
            </div>

            ${location ? `
            <div>
              <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; color: #999;">Lugar</span>
              <div style="font-size: 16px; color: #333;">${escapeHtml(location)}</div>
            </div>
            ` : ''}
          </div>

          ${calendarHref ? `
          <a href="${escapeHtml(calendarHref)}" style="display: block; background-color: #000; color: #fff; text-align: center; padding: 16px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 14px; margin-bottom: 16px;">
            Añadir a Google Calendar
          </a>
          ` : ''}

          <p style="font-size: 12px; color: #999; text-align: center; margin-top: 40px;">
            Este es un correo automático de Cerezo Editorial. Por favor no respondas a este mensaje.
          </p>
        </div>
      `
    });

    if (error) {
      console.error('Error de Resend:', error);
      return NextResponse.json(
        { code: 'PROVIDER_ERROR', message: error.message || 'El proveedor de correo rechazó el envío.' },
        { status: 502 }
      );
    }

    return NextResponse.json({ message: 'Enviado', data });
  } catch (err) {
    console.error('Fatal error:', err);
    return NextResponse.json({ code: 'SEND_FAILED', message: err.message }, { status: 500 });
  }
}
