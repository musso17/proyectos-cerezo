import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import fs from 'fs';
import path from 'path';

// Forzar la carga de variables de entorno desde .env.local al inicio
function getApiKey() {
  if (process.env.RESEND_API_KEY) return process.env.RESEND_API_KEY;

  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf8');
      const match = content.match(/^RESEND_API_KEY=(.*)$/m);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
  } catch (e) {
    console.error('Error manual env loading:', e);
  }
  return null;
}

export async function POST(request) {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    console.log('--- ERROR: RESEND_API_KEY NO ENCONTRADA ---');
    console.log('Busqué en process.env y manualmente en .env.local');
    return NextResponse.json({ message: 'Error: API Key no configurada' }, { status: 500 });
  }

  const resend = new Resend(apiKey);

  try {
    const body = await request.json();
    const { to, subject, projectName, client, manager, dateLabel, dateValue, location, time, calendarLink } = body;

    const { data, error } = await resend.emails.send({
      from: 'Cerezo Planner <notificaciones@cerezoperu.com>',
      to: [to],
      subject: subject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #f0f0f0; border-radius: 24px;">
          <h1 style="font-size: 24px; color: #1a1a1a; margin-bottom: 8px;">Nuevo Proyecto Asignado</h1>
          <p style="color: #666; font-size: 14px; margin-bottom: 32px;">Se te ha designado como responsable del siguiente proyecto en Cerezo.</p>
          
          <div style="background-color: #f9f9f9; padding: 24px; border-radius: 16px; margin-bottom: 32px;">
            <div style="margin-bottom: 16px;">
              <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; color: #999;">Proyecto</span>
              <div style="font-size: 18px; font-weight: 600; color: #1a1a1a;">${projectName}</div>
            </div>
            
            <div style="margin-bottom: 16px;">
              <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; color: #999;">Cliente</span>
              <div style="font-size: 16px; color: #333;">${client}</div>
            </div>
            
            <div style="margin-bottom: 16px;">
              <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; color: #999;">${dateLabel}</span>
              <div style="font-size: 16px; color: #333;">${dateValue} ${time ? `— ${time}` : ''}</div>
            </div>

            ${location ? `
            <div>
              <span style="font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.1em; color: #999;">Lugar</span>
              <div style="font-size: 16px; color: #333;">${location}</div>
            </div>
            ` : ''}
          </div>
          
          <a href="${calendarLink}" style="display: block; background-color: #000; color: #fff; text-align: center; padding: 16px; border-radius: 12px; text-decoration: none; font-weight: 600; font-size: 14px; margin-bottom: 16px;">
            Añadir a Google Calendar
          </a>
          
          <p style="font-size: 12px; color: #999; text-align: center; margin-top: 40px;">
            Este es un correo automático de Cerezo Editorial. Por favor no respondas a este mensaje.
          </p>
        </div>
      `
    });

    if (error) {
      console.error('Error de Resend:', error);
      return NextResponse.json({ error }, { status: 400 });
    }

    return NextResponse.json({ message: 'Enviado', data });
  } catch (err) {
    console.error('Fatal error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
