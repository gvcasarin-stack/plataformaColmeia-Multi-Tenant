# Configuração do Backup Diário do Firestore

A função de backup diário do Firestore (`scheduleFirestoreBackup`) foi implementada e implantada com sucesso. Esta função está configurada para executar automaticamente todos os dias às 3 da manhã (horário de Brasília) e criar backups de todo o banco de dados Firestore.

## Passos adicionais para ativar completamente a funcionalidade

Para que a função funcione corretamente, é necessário configurar o bucket de armazenamento que receberá os backups. Siga estes passos:

1. Acesse o [Console do Firebase](https://console.firebase.google.com/project/sistema-colmeia/overview)
2. Navegue até **Storage** no menu lateral
3. Clique em **Criar bucket** (se já não houver um bucket)
4. Crie um bucket com o nome `sistema-colmeia-firestore-backups`
5. Selecione a região `us-central1` (a mesma região onde as funções estão implantadas)
6. Configure as regras de acesso para permitir que a função Cloud Function possa escrever no bucket
7. Finalize a criação do bucket

## Verificação

Para verificar se o backup está funcionando corretamente:

1. Após a primeira execução programada (às 3h da manhã), verifique o bucket no Storage do Firebase
2. Deverá existir uma estrutura de pastas no formato `ANO/MES/DIA` com os arquivos de backup
3. Você também pode verificar os logs das funções no Console do Firebase (Functions > Logs) buscando por `[BACKUP]`

## Solução de problemas

Se os backups não estiverem sendo criados:

1. Verifique se o bucket `sistema-colmeia-firestore-backups` foi criado corretamente
2. Verifique os logs da função para identificar possíveis erros
3. Certifique-se de que a conta de serviço do Firebase tenha permissões suficientes para acessar o bucket de armazenamento
4. Se necessário, execute a função manualmente pelo Console do Firebase para testar sua funcionalidade

## Restauração de backups

Para restaurar um backup:

1. Acesse o [Console do Firebase](https://console.firebase.google.com/project/sistema-colmeia/overview)
2. Navegue até **Firestore Database**
3. Clique em **Importar e Exportar**
4. Selecione o backup desejado do bucket de armazenamento para importar

A função de backup diário está agora configurada e ativa no projeto.
