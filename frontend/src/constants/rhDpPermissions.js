export const RH_DP_PERMISSION_GROUPS = [
  {
    key: 'rh_dp',
    label: 'RH/DP',
    permissions: [
      {
        key: 'rh_dp_dashboard_view',
        label: 'Ver dashboard RH/DP',
        description: 'Permite abrir a visao inicial do modulo.'
      },
      {
        key: 'rh_dp_colaboradores_view',
        label: 'Ver colaboradores',
        description: 'Permite listar e detalhar colaboradores.'
      },
      {
        key: 'rh_dp_colaboradores_edit',
        label: 'Editar colaboradores',
        description: 'Permite cadastrar, editar e importar colaboradores.'
      },
      {
        key: 'rh_dp_documentos_view',
        label: 'Ver documentos',
        description: 'Permite consultar documentos, pendencias e links assinados.'
      },
      {
        key: 'rh_dp_documentos_manage',
        label: 'Gerir documentos',
        description: 'Permite enviar, substituir e atualizar documentos.'
      },
      {
        key: 'rh_dp_importacoes_execute',
        label: 'Executar importacoes',
        description: 'Permite subir planilhas, gerar preview e confirmar lotes.'
      },
      {
        key: 'rh_dp_apuracao_view',
        label: 'Ver apuracoes',
        description: 'Permite listar e detalhar apuracoes.'
      },
      {
        key: 'rh_dp_apuracao_edit',
        label: 'Ajustar apuracoes',
        description: 'Permite gerar apuracao, ajustar itens e concluir conferencia.'
      },
      {
        key: 'rh_dp_fechamento_execute',
        label: 'Fechar competencia',
        description: 'Permite fechar a competencia e gerar titulos no financeiro.'
      },
      {
        key: 'rh_dp_obrigacoes_view',
        label: 'Ver obrigacoes geradas',
        description: 'Permite acessar fechamentos e titulos gerados no financeiro.'
      }
    ]
  },
  {
    key: 'integracao_sienge',
    label: 'Integracao SIENGE',
    permissions: [
      {
        key: 'integracao_sienge_view',
        label: 'Ver fila e logs do SIENGE',
        description: 'Permite consultar status, fila, prontidao e logs.'
      },
      {
        key: 'integracao_sienge_retry',
        label: 'Operar fila do SIENGE',
        description: 'Permite enviar titulos e reprocessar falhas.'
      },
      {
        key: 'integracao_sienge_config_manage',
        label: 'Configurar integracao SIENGE',
        description: 'Permite editar endpoint, defaults e parametros da integracao.'
      }
    ]
  }
];

export const RH_DP_PERMISSION_KEYS = RH_DP_PERMISSION_GROUPS.flatMap((group) =>
  group.permissions.map((permission) => permission.key)
);

export function normalizeRhDpPermission(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

export function normalizeRhDpPermissionList(list = []) {
  const allowed = new Set(RH_DP_PERMISSION_KEYS.map(normalizeRhDpPermission));
  return [
    ...new Set(
      (Array.isArray(list) ? list : [])
        .map(normalizeRhDpPermission)
        .filter((item) => allowed.has(item))
    )
  ];
}
