-- ======================================================
-- SCRIPT FINAL PARA POPULAR CONFIGS - VERSÃO FUNCIONANDO
-- ======================================================

DO $$ 
DECLARE
    tenant_id UUID := '5790d7a1-1c54-4fa8-b509-db766ca6bc3c';
    user_id UUID;
BEGIN
    -- Buscar primeiro usuário
    SELECT id INTO user_id FROM auth.users LIMIT 1;
    RAISE NOTICE 'Usando tenant_id: % e created_by: %', tenant_id, user_id;
    
    -- 1. INSERIR CHECKLIST MESSAGE
    INSERT INTO configs (tenant_id, category, key, value, description, created_by, created_at, updated_at)
    VALUES (
        tenant_id,
        'default',
        'checklist_message',
        '"Checklist de Documentos Necessários para o Projeto\n\nSeu projeto está prestes a ser desenvolvido. Porém antes vamos precisar que você nos encaminhe os seguintes documentos:\n\n📋 Documentos do Cliente:\n• Fatura de Energia com dados legíveis;\n• Documento de identidade completo (frente e verso) do responsável legal (CNH ou Documento de Identidade). Se a titularidade estiver em nome de Pessoa Jurídica (CNPJ), encaminhar também o cartão CNPJ e Contrato Social, além do documento de identidade do responsável legal pela unidade consumidora;\n\n🏠 Informações do Local:\n• Foto do Padrão de Entrada (Mostrando Poste e Caixa de Medição);\n• Foto ou informação de qual é o Disjuntor do Padrão de Entrada;\n• Coordenadas Geográficas exatas do telhado do cliente ou local de instalação;\n\n⚡ Dados Técnicos:\n• Lista de Materiais contendo: Marca, Modelo e Quantidade de Módulos, Inversores e demais componentes (Ex: Stringbox, se houver);\n\n📄 Documentação Adicional:\n• Se for seu Primeiro Projeto conosco, encaminhe a Logo da sua empresa para colocarmos nas pranchas do projeto;\n• A Instalação será em solo ou em telhado?\n• Fotos do telhado/área de instalação (não obrigatório);\n• Para os projetos nas distribuidoras ENEL ou EQUATORIAL, encaminhar foto que contenha o número do poste que alimenta a unidade consumidora, ou o poste mais próximo do local de atendimento.\n\nUma vez que todos os documentos sejam encaminhados, nossa equipe avaliará e em até 24h retornará informando se a documentação está de acordo, ou se necessita de alguma correção ou adição de documentos. Se tudo estiver correto, seu projeto seguirá para a próxima etapa para ser desenvolvido."'::jsonb,
        'Mensagem padrão do checklist de documentos para projetos',
        user_id,
        NOW(),
        NOW()
    );
    RAISE NOTICE 'SUCCESS: Checklist message inserido';
    
    -- 2. INSERIR FAIXAS DE POTÊNCIA
    INSERT INTO configs (tenant_id, category, key, value, description, created_by, created_at, updated_at)
    VALUES (
        tenant_id,
        'default',
        'faixas_potencia',
        '[
            {"valorBase": 600, "potenciaMax": 5, "potenciaMin": 0},
            {"valorBase": 600, "potenciaMax": 10, "potenciaMin": 5},
            {"valorBase": 700, "potenciaMax": 20, "potenciaMin": 10},
            {"valorBase": 800, "potenciaMax": 30, "potenciaMin": 20},
            {"valorBase": 1000, "potenciaMax": 40, "potenciaMin": 30},
            {"valorBase": 1500, "potenciaMax": 50, "potenciaMin": 40},
            {"valorBase": 2000, "potenciaMax": 75, "potenciaMin": 50},
            {"valorBase": 2500, "potenciaMax": 150, "potenciaMin": 75},
            {"valorBase": 3000, "potenciaMax": 300, "potenciaMin": 150},
            {"valorBase": 4000, "potenciaMax": 999999, "potenciaMin": 300}
        ]'::jsonb,
        'Faixas de potência (kWp) e valores base para cálculo automático de preços',
        user_id,
        NOW(),
        NOW()
    );
    RAISE NOTICE 'SUCCESS: Faixas de potência inseridas';
    
    -- 3. INSERIR DADOS BANCÁRIOS
    INSERT INTO configs (tenant_id, category, key, value, description, created_by, created_at, updated_at)
    VALUES (
        tenant_id,
        'default',
        'dados_bancarios',
        '{"banco": "Dock Instituição de Pagamentos S. A.", "conta": "1557547-5", "agencia": "0001", "chavePix": "(48) 9 9176-0130", "documento": "48.580.666/0001-67", "favorecido": "Goiás Solar LTDA"}'::jsonb,
        'Dados bancários da empresa para pagamentos e PIX',
        user_id,
        NOW(),
        NOW()
    );
    RAISE NOTICE 'SUCCESS: Dados bancários inseridos';
    
    -- 4. INSERIR OUTRAS CONFIGURAÇÕES ÚTEIS
    INSERT INTO configs (tenant_id, category, key, value, description, created_by, created_at, updated_at)
    VALUES (
        tenant_id,
        'default',
        'app_name',
        '"Plataforma Goiás Solar"'::jsonb,
        'Nome da aplicação para este tenant',
        user_id,
        NOW(),
        NOW()
    );
    RAISE NOTICE 'SUCCESS: App name inserido';
    
    INSERT INTO configs (tenant_id, category, key, value, description, created_by, created_at, updated_at)
    VALUES (
        tenant_id,
        'default',
        'email_assinatura',
        '"<br><br>---<br><strong>Equipe Goiás Solar</strong><br>Energia sustentável para o futuro<br>📞 Contato: (62) 9999-9999<br>📧 contato@goiassolar.com"'::jsonb,
        'Assinatura padrão para emails da empresa',
        user_id,
        NOW(),
        NOW()
    );
    RAISE NOTICE 'SUCCESS: Email assinatura inserida';
    
END $$;

-- VERIFICAÇÃO FINAL
SELECT 'CONFIGURAÇÕES INSERIDAS:' as status;
SELECT 
    category,
    key,
    LEFT(value::text, 80) || '...' as value_preview,
    description,
    created_at
FROM configs 
WHERE tenant_id = '5790d7a1-1c54-4fa8-b509-db766ca6bc3c'
ORDER BY created_at;

SELECT 'TOTAL DE CONFIGS:' as status;
SELECT COUNT(*) as total FROM configs;