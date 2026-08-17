CREATE POLICY "Anexos de chamados: leitura autenticada"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'ticket-attachments');

CREATE POLICY "Anexos de chamados: upload autenticado"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'ticket-attachments' AND owner = auth.uid());

CREATE POLICY "Anexos de chamados: dono ou admin remove"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'ticket-attachments' AND (owner = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role)));