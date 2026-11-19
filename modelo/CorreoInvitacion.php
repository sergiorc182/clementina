<?php

class CorreoInvitacion
{
    public function enviar(string $email, string $nombre, string $token): array
    {
        $remitente = trim((string) getenv('CLEMENTINA_MAIL_FROM'));
        if ($remitente === '' || !filter_var($remitente, FILTER_VALIDATE_EMAIL)) {
            return ['enviado' => false, 'mensaje' => 'No hay servicio de correo configurado.'];
        }
        if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !preg_match('/^[a-f0-9]{64}$/', $token)) {
            return ['enviado' => false, 'mensaje' => 'No se pudo enviar la invitación.'];
        }

        $host = (string) ($_SERVER['HTTP_HOST'] ?? '');
        if (!preg_match('/^[A-Za-z0-9.-]+(?::[0-9]{1,5})?$/', $host)) {
            return ['enviado' => false, 'mensaje' => 'No se pudo enviar la invitación.'];
        }

        $https = !empty($_SERVER['HTTPS']) && strtolower((string) $_SERVER['HTTPS']) !== 'off';
        if (!empty($_SERVER['HTTP_X_FORWARDED_PROTO'])) {
            $https = strtolower((string) $_SERVER['HTTP_X_FORWARDED_PROTO']) === 'https';
        }
        $esquema = $https ? 'https' : 'http';

        $script = str_replace('\\', '/', (string) ($_SERVER['SCRIPT_NAME'] ?? ''));
        $base = $script === '' ? '' : rtrim(dirname($script, 3), '/');
        $url = $esquema . '://' . $host . $base . '/vista/activar_cuenta.html?token=' . $token;

        $nombre = preg_replace('/[\r\n]+/', ' ', trim($nombre));
        $asunto = 'Activa tu cuenta Clementina';
        $cuerpo = "Hola {$nombre},\n\n"
            . "Usá este enlace para configurar tu contraseña y activar tu cuenta:\n"
            . $url . "\n\n"
            . "El enlace vence en 48 horas y solo puede usarse una vez.\n"
            . "Si no esperabas este alta, ignorá este mensaje.\n";

        $cabeceras = "From: Clementina <{$remitente}>\r\n"
            . "Reply-To: {$remitente}\r\n"
            . "Content-Type: text/plain; charset=UTF-8\r\n";

        $enviado = @mail($email, $asunto, $cuerpo, $cabeceras);

        return [
            'enviado' => (bool) $enviado,
            'mensaje' => $enviado
                ? 'Se envió la invitación para activar la cuenta.'
                : 'No se pudo enviar el correo. La invitación sigue pendiente.',
        ];
    }
}
