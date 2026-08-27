-- Tabela de processos / base de conhecimento Rodopar
CREATE TABLE IF NOT EXISTS public.processos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo      text NOT NULL,
  categoria   text NOT NULL,
  descricao   text NOT NULL,
  passos      jsonb NOT NULL DEFAULT '[]',
  tags        text[] DEFAULT '{}',
  ativo       boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.processos TO authenticated;
GRANT ALL ON public.processos TO service_role;

ALTER TABLE public.processos ENABLE ROW LEVEL SECURITY;

-- Leitura: qualquer usuário autenticado
CREATE POLICY "processos_select" ON public.processos
  FOR SELECT TO authenticated USING (true);

-- Escrita: somente admin
CREATE POLICY "processos_insert" ON public.processos
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "processos_update" ON public.processos
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER processos_updated_at
  BEFORE UPDATE ON public.processos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ── Seed — processos extraídos dos manuais Visual Rodopar ────────────────────

INSERT INTO public.processos (titulo, categoria, descricao, passos, tags) VALUES

('Controle de Pagamentos de Tributos (IPVA, Seguro, Licenciamento)', 'Frota',
 'Configura e controla o pagamento de tributos de veículos (IPVA, Seguro Obrigatório e Licenciamento) no sistema Visual Rodopar, incluindo calendários de vencimento por estado e geração de contas a pagar.',
 '[
  {"ordem":1,"titulo":"Cadastrar Classes de Veículos","descricao":"Acesse Frota > Cadastro > Classes de Veículos. Clique em Incluir, informe o código e a descrição da classe (ex: Caminhões, ônibus e micro-ônibus) e salve. As classes filtram os veículos vinculados para o cálculo de tributos.","observacao":"Observe as regras de cada estado, pois os calendários podem variar por tipo de veículo."},
  {"ordem":2,"titulo":"Vincular Classe e Município no Cadastro do Veículo","descricao":"No cadastro do veículo, informe o campo Classe Documentação com o código da classe cadastrada. É obrigatório informar também o Município IPVA (município de licenciamento do veículo).","observacao":"O campo Município IPVA é essencial — sem ele o cálculo pode falhar."},
  {"ordem":3,"titulo":"Configurar Controle de Pagamento (módulo Tributos)","descricao":"Acesse Tributos > Cadastro > Controle de Pagamento. Preencha: Classe do Veículo, Fornecedor (ex: DETRAN), Tarefa-ERP, Tipo de Documento, Banco, Ano de Referência, Tipo Documento (IPVA/Seguro/Licenciamento), Estado, Tipo de Geração (Dezena Final ou Último Dígito) e Tipo de Vencimento. Crie um registro por ano.","observacao":"Se houver mais de um tipo de vencimento para a mesma classe, crie um registro separado para cada tipo."},
  {"ordem":4,"titulo":"Configurar Parcelas e Vencimentos","descricao":"Na aba Parcelas/Vencimentos do registro de Controle de Pagamento, configure as datas de vencimento conforme o calendário estadual, informando Dezena Final ou Último Dígito e a data correspondente.","observacao":"Consulte o calendário do DETRAN do respectivo estado (ex: SP usa Último Dígito; ES usa Dezena Final)."},
  {"ordem":5,"titulo":"Calcular Obrigações (Tributos)","descricao":"Acesse Movimentação > Cálculo de Obrigações (Tributos). Informe: Classe do Veículo, Ano de Referência e Estado. Clique em Calcular. O sistema gerará os registros de vencimento para todos os veículos da classe filtrada.","observacao":"Filtros opcionais (Filial, Frota, Placa) permitem calcular apenas para veículos específicos."},
  {"ordem":6,"titulo":"Atualizar Documentos e Lançar Valor","descricao":"Acesse Movimentação > Atualização de Documentos (Tributos). Localize o veículo e o tipo de obrigação. Ao receber a cobrança, lance o valor na coluna Valor Documento. Clique em Efetuar para gerar o registro no Contas a Pagar. Após o licenciamento, atualize CRLV e Data Emissão DUT.","observacao":"Legendas de status: Aguardando Valor / Pagamento Pendente / Liquidado / Cancelado."},
  {"ordem":7,"titulo":"Cancelar Documentos (baixa do veículo)","descricao":"Acesse Movimentação > Cancelamento de Documentos. Informe o tipo Documentos de Obrigações, a placa, o ano de referência e o tipo (I=IPVA, S=Seguro, L=Licenciamento). Informe o motivo e salve.","observacao":"O tipo aceita apenas: I (IPVA), S (SEGURO), L (LICENCIAMENTO)."}
 ]',
 ARRAY['ipva','licenciamento','seguro','tributos','frota','veículos']),

('Instalação de Certificado Digital na Máquina Local', 'TI',
 'Instala um certificado digital no repositório da conta de computador (não do usuário individual) usando o Console de Gerenciamento do Windows (MMC), garantindo que qualquer usuário do computador possa utilizá-lo.',
 '[
  {"ordem":1,"titulo":"Abrir o Console de Gerenciamento (MMC)","descricao":"Abra a janela Executar (Win+R) e digite mmc.exe. Clique em OK. O console será aberto com privilégios administrativos.","observacao":"Certifique-se de executar com permissões de administrador local."},
  {"ordem":2,"titulo":"Adicionar Snap-in de Certificados","descricao":"No console, clique em Arquivo > Adicionar/Remover Snap-in (Ctrl+M). Na lista de Snap-ins disponíveis, selecione Certificados e clique em Adicionar."},
  {"ordem":3,"titulo":"Selecionar Conta de Computador","descricao":"Na janela do Snap-in, escolha a opção Conta de Computador (não Minha conta de usuário) e clique em Avançar.","observacao":"Esta opção garante que o certificado ficará disponível para todos os usuários da máquina."},
  {"ordem":4,"titulo":"Selecionar Computador Local","descricao":"Na tela Selecionar Computador, mantenha selecionado Computador local e clique em Concluir. Depois clique em OK para fechar a janela de snap-ins."},
  {"ordem":5,"titulo":"Importar o Certificado para a Pasta Correta","descricao":"Na árvore da Raiz do Console, expanda Certificados (computador local). Clique com o botão direito sobre a pasta de destino (ex: Pessoal) > Todas as Tarefas > Importar.","observacao":"Escolha a pasta correta conforme o tipo de certificado."},
  {"ordem":6,"titulo":"Concluir a Importação","descricao":"No Assistente de Importação, clique em Avançar, localize o arquivo do certificado no disco, confirme o local do repositório e clique em Concluir. O certificado estará disponível para todos os usuários da máquina."}
 ]',
 ARRAY['certificado','mmc','windows','ti','instalação']),

('Controle de Deslocamento Vazio', 'Frota',
 'Registra e controla os deslocamentos de veículos realizados sem carga, vinculando ao motivo do deslocamento, motorista e linha itinerária para fins de controle operacional.',
 '[
  {"ordem":1,"titulo":"Cadastrar Motivos de Deslocamento","descricao":"Acesse Frota > Cadastro > Motivos de Deslocamento. Clique em Incluir, informe a descrição do motivo (ex: Atender outra coleta) e clique em Salvar."},
  {"ordem":2,"titulo":"Incluir Deslocamento Vazio","descricao":"Acesse Frota > Movimentação > Deslocamento Vazio. Clique em Incluir e preencha: Placa do Veículo, Placa da Carreta, Data da Saída, Km da Saída, Motorista, Linha Itinerária, Motivo, Previsão de Chegada, Filial de Destino e Solicitante."},
  {"ordem":3,"titulo":"Efetuar o Deslocamento","descricao":"Após preencher todos os campos, clique no botão Efetuar (ou Autorizar). O sistema confirmará com Documento Autorizado com sucesso! e o registro ficará com situação Cadastrado."},
  {"ordem":4,"titulo":"Baixar o Deslocamento (Finalizar)","descricao":"Ao término do deslocamento, abra o registro e preencha a Data Real de Chegada e o Km de Chegada. Clique em Baixar. O sistema confirmará com Documento Baixado com sucesso! e a situação passará para Baixado."}
 ]',
 ARRAY['deslocamento','vazio','frota','veículos','motorista']),

('Remessa Bancária de Contas a Pagar', 'Financeiro',
 'Gera arquivos de remessa bancária para pagamento de fornecedores via DOC/TED, incluindo leitura de código de barras ou linha digitável e processamento do arquivo de retorno do banco.',
 '[
  {"ordem":1,"titulo":"Configurar Dados Bancários do Fornecedor","descricao":"Acesse Faturamento > Cadastro de Parceiros Comerciais. Localize o fornecedor e, na aba Financeiro, informe o Banco de Depósito, Agência e Conta Corrente. Esses dados são obrigatórios para gerar a remessa do tipo DOC ou TED."},
  {"ordem":2,"titulo":"Informar Código de Barras ou Linha Digitável no Título","descricao":"Acesse Fluxo de Caixa > Movimentação > Entrada do Contas à Pagar. Localize o título, na aba Parcelas selecione a parcela e clique em Alterar. Para código de barras: clique no campo Cód. Barras e faça a leitura. Para linha digitável: clique no campo LinhaDigitável e pressione F9 (boletos) ou F10 (concessionárias).","observacao":"A leitura é obrigatória para inclusão na remessa."},
  {"ordem":3,"titulo":"Gerar Remessa","descricao":"Acesse Fluxo de Caixa > Movimentação > Remessa do Contas à Pagar. Clique em Incluir e informe: Filial, Conta Corrente de Pagamento. Selecione os documentos na situação Devedor e clique em Gerar Remessa. Confira a Modalidade de cada título antes de processar.","observacao":"Confira os dados antes de processar para evitar rejeição bancária."},
  {"ordem":4,"titulo":"Processar o Arquivo de Remessa","descricao":"Após gerar a remessa, clique no botão Processar. O sistema gerará o arquivo de remessa bancária (ex: PG160794.txt) que deverá ser enviado ao banco."},
  {"ordem":5,"titulo":"Importar Retorno Bancário","descricao":"Após o banco processar o pagamento, entre na remessa gerada e clique em Retorno. Localize o arquivo de retorno do banco, selecione-o e clique em Processar Retorno. O sistema gera um cheque com os documentos inconsistentes para conferência. Clique em Efetuar no cheque para baixar os arquivos."}
 ]',
 ARRAY['remessa','bancária','contas a pagar','financeiro','doc','ted','boleto']),

('Cadastro e Emissão de Relatórios', 'TI',
 'Configura o módulo de relatórios do Visual Rodopar, definindo níveis de acesso, módulos, sub-módulos, cadastro de relatórios Crystal Reports (.rpt) e configuração de impressoras por estação.',
 '[
  {"ordem":1,"titulo":"Cadastrar Níveis de Permissão","descricao":"Acesse Relatórios > Cadastro de Níveis de Permissão. Clique em Incluir, informe a descrição do nível de acesso (ex: OPERADOR, SUPERVISOR) e clique em Salvar."},
  {"ordem":2,"titulo":"Cadastrar Módulos","descricao":"Acesse Relatórios > Cadastro de Módulos. Clique em Incluir, informe a descrição do módulo (ex: Frota, Fluxo de Caixa) e clique em Salvar."},
  {"ordem":3,"titulo":"Cadastrar Sub-Módulos","descricao":"Acesse Relatórios > Cadastro de Sub-Módulos. Clique em Incluir, informe a descrição do sub-módulo (ex: Pneus, Manutenção), vincule ao Módulo correspondente e clique em Salvar."},
  {"ordem":4,"titulo":"Cadastrar Relatório (.rpt)","descricao":"Acesse Relatórios > Cadastro de Relatórios. Clique em Incluir e informe: nome do relatório, filial, sub-módulo, nível mínimo de acesso. Clique em ... para localizar o arquivo .rpt no servidor. Clique em Buscar Parâmetros para carregar os parâmetros. Para vincular o relatório a uma tela do sistema, marque Vincular relatório a tela.","observacao":"O arquivo .rpt deve estar acessível no servidor no momento do cadastro."},
  {"ordem":5,"titulo":"Emissão de Relatórios","descricao":"Acesse Relatórios > Emissão de Relatórios. Use os filtros de Módulo, Sub-Módulo, Relatório ou Palavra-chave para localizar o relatório desejado."},
  {"ordem":6,"titulo":"Configurar Regras de Relatórios (opcional)","descricao":"Acesse Relatórios > Regras de Relatórios. Clique em Incluir, selecione o relatório e defina as etapas da regra (Regra Condicional, Mensagem Usuário, Pergunta Usuário ou Execução de Script SQL)."},
  {"ordem":7,"titulo":"Configurar Impressoras por Estação","descricao":"Acesse Relatórios > Configurações de Estações. Clique no ícone de novo registro — o sistema detecta automaticamente a estação local. Informe o usuário (ou [TODOS] para qualquer usuário), o relatório, a impressora e o tipo de papel. Salve.","observacao":"Define qual impressora e papel são usados automaticamente ao imprimir aquele relatório naquela estação."}
 ]',
 ARRAY['relatórios','crystal reports','impressora','permissão','ti']),

('Expedição por EDI (Importação NOTFIS)', 'Operacional',
 'Importa arquivos EDI no formato NOTFIS para gerar programações de carga e conhecimentos de transporte (CTRC) automaticamente, finalizando com a emissão do Manifesto de Carga.',
 '[
  {"ordem":1,"titulo":"Importar Arquivo NOTFIS","descricao":"Acesse Util > Rotinas de Apoio > Utilização e clique na rotina EDI - NOTFIS. Localize a pasta com o arquivo, selecione-o e informe: Filial, Linha, Produto e Tipo de Cliente. Clique em Processar. Ao finalizar, o sistema informará as programações de carga criadas."},
  {"ordem":2,"titulo":"Gerar CTRCs a partir das Programações de Carga","descricao":"Acesse Faturamento > Movimentação > Conhecimento. Inclua um CTRC e clique em Imp. Prog. Carga. Selecione as programações clicando na pasta amarela (use F2 para múltiplas programações). Informe: Filial, Série, Motorista, Placa, Tabela de Frete e marque Efetuar após importar. Clique em Gerar.","observacao":"O sistema informará os números de todos os CTRCs criados."},
  {"ordem":3,"titulo":"Efetuar os CTRCs","descricao":"Após gerados os CTRCs, o sistema solicitará validação dos valores. Confira os dados e efetue cada CTRC. O usuário pode imprimir individualmente ou todos ao final."},
  {"ordem":4,"titulo":"Emitir Manifesto de Carga","descricao":"Acesse Faturamento > Movimentação > Manifesto > Emissão. Na aba Geral, informe: Filial, Motorista, Linha, Filial Destino e Cód. Horário. Clique na pasta amarela para incluir os CTRCs. Clique em Efetuar para finalizar. Imprima o Manifesto."}
 ]',
 ARRAY['edi','notfis','ctrc','manifesto','expedição','operacional']),

('Expedição Manual (Programação de Carga e CTRC)', 'Operacional',
 'Cria programações de carga manualmente, gera Ordem de Coleta (ACT), Conhecimento de Transporte (CTRC) e Manifesto de Carga de forma não automatizada pelo EDI.',
 '[
  {"ordem":1,"titulo":"Criar Programação de Carga","descricao":"Acesse Programação > Movimentação > Programação de Carga. Clique em Incluir. Na aba Geral, informe: Tomador de Serviço (Pagador), Linha Itinerária, Data Pedido, Data Retirada, Data Entrega e Remetente. Na aba Composição da Carga, informe: Destinatário, Série e Nº da Nota Fiscal, Data NF, Quantidade, Peso e Valor da Mercadoria."},
  {"ordem":2,"titulo":"Acompanhamento de Programação de Carga","descricao":"Acesse Programação > Movimentação > Acompanhamento de Programação de Carga. Selecione a programação desejada, informe o veículo e arraste o ícone do caminhão sobre o veículo selecionado para gerar uma Programação de Veículo."},
  {"ordem":3,"titulo":"Efetuar Programação de Veículo","descricao":"O sistema cria a Programação de Veículo automaticamente. Para iniciar a operação, clique em Efetuar - Start. A programação passará para status Em Andamento. Para gerar a ACT (Ordem de Coleta), clique em Gerar ACT e informe a Filial e Série da ACT."},
  {"ordem":4,"titulo":"Finalizar ACT (Ordem de Coleta)","descricao":"O sistema abrirá a ACT criada e calculará o frete automaticamente. Na aba Comp. de Frete é possível visualizar os valores. Revise e finalize a Ordem de Coleta. Para gerar o CTRC, clique em Gerar CTRC."},
  {"ordem":5,"titulo":"Efetuar e Imprimir o CTRC","descricao":"O sistema gera o CTRC a partir da ACT. Revise os dados, clique em Efetuar para finalizar e imprima o CTRC."},
  {"ordem":6,"titulo":"Emitir Manifesto de Carga","descricao":"Acesse Faturamento > Movimentação > Manifesto > Emissão. Informe Filial, Motorista, Linha, Filial Destino e Cód. Horário. Inclua os CTRCs clicando na pasta amarela. Clique em Efetuar e imprima o Manifesto."},
  {"ordem":7,"titulo":"Lançar Entrega / Baixar Manifesto","descricao":"Acesse Faturamento > Movimentação > Entrega/Remessa. Informe o Nº do CTRC, Nº do Manifesto ou Nº da Nota Fiscal, a Filial da Baixa, o Código da Ocorrência de Baixa e a Data da Baixa. Clique em Efetuar para confirmar a baixa da entrega."}
 ]',
 ARRAY['expedição','programação de carga','ctrc','act','manifesto','operacional']),

('Pagamento de Motoristas Terceiros (Carta Frete)', 'Operacional',
 'Gera o Contrato de Transportes (Carta Frete) para motoristas terceiros após a finalização do Manifesto de Carga, e emite cheque para pagamento de adiantamento e saldo.',
 '[
  {"ordem":1,"titulo":"Gerar Carta Frete (Contrato de Transportes)","descricao":"Após finalizar e efetivar o Manifesto de Carga, clique no botão Gerar Contrato. O sistema buscará automaticamente a tabela de frete do motorista/agregado para calcular os valores. Se houver adiantamento, preencha os campos Vlr. Adiant. ou Outros Adiant. Clique em Efetuar para finalizar a carta frete."},
  {"ordem":2,"titulo":"Emitir Cheque de Adiantamento ou Saldo","descricao":"Acesse Fluxo de Caixa > Relatórios > Contas à Pagar > Emissão de Cheque. Na aba Cheque, informe: Conta Corrente, Tipo de Doc CH, Nº do Cheque, Data e Histórico. Na aba Documentos, busque o documento (adiantamento aparece como CTA ou CTD; saldo aparece com o número da carta frete). Selecione e clique em Efetuar Cheque."}
 ]',
 ARRAY['carta frete','motorista','terceiro','pagamento','cheque','operacional']),

('Pagamento de Motoristas Agregados (Ficha de Tráfego)', 'Operacional',
 'Registra o adiantamento de motoristas agregados (fechamento quinzenal) por meio da Ficha de Tráfego e emite cheques de adiantamento e saldo vinculados ao Manifesto de Carga.',
 '[
  {"ordem":1,"titulo":"Gerar Ficha de Tráfego","descricao":"Acesse Frota > Movimentação > Ficha de Tráfego. Clique em Incluir e informe o Nº do Manifesto. O sistema preencherá automaticamente todos os campos da Ficha de Tráfego com base no manifesto.","observacao":"Use para agregados que fecham quinzenalmente."},
  {"ordem":2,"titulo":"Registrar Adiantamento na Ficha","descricao":"Na aba Adiantamento da Ficha de Tráfego, informe o valor do adiantamento. Clique em Gerar Contas Pagar/Bancos para efetivar o lançamento no módulo financeiro."},
  {"ordem":3,"titulo":"Emitir Cheque de Adiantamento ou Saldo","descricao":"Acesse Fluxo de Caixa > Relatórios > Contas à Pagar > Emissão de Cheque. Informe: Conta Corrente, Tipo CH, Nº do Cheque, Data e Histórico. Na aba Documentos, localize o documento (formato Filial-Nº Ficha-Nº Adiantamento). Selecione e clique em Efetuar Cheque."}
 ]',
 ARRAY['ficha de tráfego','motorista','agregado','adiantamento','cheque','operacional']),

('Controle de Abastecimento Interno', 'Frota',
 'Controla o abastecimento realizado em postos internos da empresa, desde o cadastro dos postos, bombas e turnos, até o pedido de compra de combustível, entrada de nota fiscal, requisição e lançamento de abastecimento.',
 '[
  {"ordem":1,"titulo":"Cadastrar Posto Interno","descricao":"Acesse Frota > Cadastro > Abastecimento > Postos. Clique em Inserir. Na aba Dados Cadastrais, informe: Filial, Descrição, CNPJ, Endereço e Fornecedor. Na aba Complemento, informe os tipos de combustível e valores. Na aba Quantidade Sugerida, informe a quantidade sugerida por modelo de veículo."},
  {"ordem":2,"titulo":"Cadastrar Bombas","descricao":"Acesse Frota > Cadastro > Abastecimento > Bombas. Clique em Inserir e informe: Filial, Descrição, Posto, Tipo de Combustível, Localidade, Produto, se utiliza Lacre e Encerrante, Código de Integração e Origem do Valor."},
  {"ordem":3,"titulo":"Cadastrar Turnos","descricao":"Acesse Frota > Cadastro > Abastecimento > Turnos. Clique em Inserir e informe: Filial, Descrição (ex: 1º Turno), Hora Inicial e Hora Final. Clique em Salvar."},
  {"ordem":4,"titulo":"Gerar Pedido de Compra de Combustível","descricao":"Acesse Materiais > Movimentação > Pedido de Compra > Manutenção. Clique em Incluir e informe: Filial, Data, Forma de Pagamento e Fornecedor. Na aba Itens, informe Produto, Quantidade e Valor Unitário. Na aba Classificação, informe os dados contábeis. Clique em Efetuar.","observacao":"O pedido precisa ser aprovado pelos responsáveis antes de prosseguir."},
  {"ordem":5,"titulo":"Dar Entrada da Nota Fiscal de Combustível","descricao":"Acesse Materiais > Movimentação > Entrada. Clique em Incluir, informe o Fornecedor, Tipo NF, Série e Nº da Nota Fiscal. Busque o pedido de compra correspondente — o sistema preencherá todos os dados automaticamente. Clique em Efetuar."},
  {"ordem":6,"titulo":"Incluir Requisição de Abastecimento","descricao":"Acesse Frota > Movimentação > Abastecimento > Requisição. Clique em Incluir e informe: Data, Posto de Abastecimento, Veículo, Tipo de Combustível, Linha Itinerária, Km Atual e Quantidade. Clique em Salvar."},
  {"ordem":7,"titulo":"Lançar Abastecimento","descricao":"Acesse Frota > Movimentação > Abastecimento > Lançamento. Clique em Incluir, informe o Nº da Requisição (se existir) — o sistema importará os dados. Informe o Nº do Documento, Data e Km Atual. Clique em Salvar e confirme Sim para efetuar."},
  {"ordem":8,"titulo":"Correção de Lançamentos","descricao":"Acesse Frota > Movimentação > Abastecimento > Correção Lançamento. Clique em Buscar, use os filtros para localizar o registro incorreto, faça as alterações necessárias e clique em Salvar."}
 ]',
 ARRAY['abastecimento','combustível','posto','frota','diesel']),

('Controle de Abastecimento Externo', 'Frota',
 'Controla o abastecimento realizado em postos externos (parceiros/rede conveniada), incluindo conferência da nota fiscal enviada pelo posto com os lançamentos e geração do Contas a Pagar.',
 '[
  {"ordem":1,"titulo":"Cadastrar Posto Externo","descricao":"Acesse Frota > Cadastro > Abastecimento > Postos. Clique em Inserir e preencha os dados do posto externo (fornecedor/rede de postos): Filial, Descrição, CNPJ, Endereço e Fornecedor. Na aba Complemento, informe os combustíveis e valores acordados.","observacao":"O cadastro de posto externo segue o mesmo procedimento do posto interno, mas representa um estabelecimento parceiro."},
  {"ordem":2,"titulo":"Incluir Requisição de Abastecimento","descricao":"Acesse Frota > Movimentação > Abastecimento > Requisição. Clique em Incluir e informe: Data, Posto de Abastecimento externo, Veículo, Tipo de Combustível, Linha Itinerária, Km Atual e Quantidade. Clique em Salvar."},
  {"ordem":3,"titulo":"Lançar Abastecimento","descricao":"Acesse Frota > Movimentação > Abastecimento > Lançamento. Informe o Nº da Requisição, Nº do Documento, Data e Km Atual. Clique em Salvar e confirme Sim para efetuar."},
  {"ordem":4,"titulo":"Conferência de Abastecimento com Nota Fiscal","descricao":"Acesse Frota > Movimentação > Abastecimento > Conferência. Informe o Posto, o período de acerto e os dados da nota fiscal do posto (Filial, Tipo Doc, Data de Emissão, Série e Número). Selecione os abastecimentos que compõem a nota. Na aba Fiscal, informe o Código Fiscal, Grupo Fiscal, Base de Cálculo e Alíquota de ICMS. Clique em Efetuar para lançar a nota no Contas a Pagar.","observacao":"O sistema valida o total dos lançamentos com o valor da nota fiscal antes de efetuar."},
  {"ordem":5,"titulo":"Correção de Lançamentos","descricao":"Acesse Frota > Movimentação > Abastecimento > Correção Lançamento. Clique em Buscar, localize o registro com erro usando os filtros, faça as correções e clique em Salvar."}
 ]',
 ARRAY['abastecimento','combustível','posto externo','frota','nota fiscal','diesel']);