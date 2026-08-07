// Multipart upload endpoint for move clips.
//
// Server functions cannot take a file stream, so the clip upload uses a raw
// server route. Size cap and MIME allowlist are enforced here, server-side.

import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/pin")({
  server: {
    handlers: {
      GET: async () => {
        const { pinningEnabled, gatewayBase, MAX_UPLOAD_BYTES, ALLOWED_MEDIA_TYPES } = await import(
          "@/lib/pinata.server"
        );
        return Response.json({
          enabled: pinningEnabled(),
          gateway: gatewayBase(),
          maxBytes: MAX_UPLOAD_BYTES,
          accepts: ALLOWED_MEDIA_TYPES,
        });
      },
      POST: async ({ request }) => {
        const { pinFile, pinningEnabled, MAX_UPLOAD_BYTES, ALLOWED_MEDIA_TYPES } = await import(
          "@/lib/pinata.server"
        );
        if (!pinningEnabled()) {
          return Response.json({ error: "IPFS pinning is not configured." }, { status: 503 });
        }

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return Response.json({ error: "Expected a multipart upload." }, { status: 400 });
        }

        const file = form.get("file");
        if (!(file instanceof File)) {
          return Response.json({ error: "No file field in the upload." }, { status: 400 });
        }
        if (file.size === 0) {
          return Response.json({ error: "The uploaded file is empty." }, { status: 400 });
        }
        if (file.size > MAX_UPLOAD_BYTES) {
          return Response.json(
            { error: `Clip is too large (max ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB).` },
            { status: 413 },
          );
        }
        if (!(ALLOWED_MEDIA_TYPES as readonly string[]).includes(file.type)) {
          return Response.json(
            { error: `Unsupported file type: ${file.type || "unknown"}.` },
            { status: 415 },
          );
        }

        const rawName = String(form.get("name") ?? file.name ?? "move-clip");
        const name = rawName.replace(/[^\w.\- ]+/g, "").slice(0, 80) || "move-clip";

        try {
          const pin = await pinFile(file, name);
          return Response.json({
            cid: pin.cid,
            uri: `ipfs://${pin.cid}`,
            gateway: pin.gateway,
            size: pin.size,
            mimeType: file.type,
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          return Response.json(
            { error: msg.startsWith("pinata_") ? "IPFS pinning service rejected the upload." : msg },
            { status: 502 },
          );
        }
      },
    },
  },
});
