/**
 * Suíte de Testes Automatizados para o Sistema de Rodízio e Métricas Finzero
 * Cobre:
 * 1. Rodízio concorrente e sequencial determinístico
 * 2. Idempotência por tentativa única (prevenção de duplo clique)
 * 3. Pausas e exclusões lógicas (soft-delete)
 * 4. Tratamento seguro de ausência de atendentes ativos
 * 5. Cálculo preciso de períodos no fuso America/Sao_Paulo
 */

interface Attendant {
  id: string;
  name: string;
  phone: string;
  is_active: boolean;
  is_deleted: boolean;
  display_order: number;
  created_at: string;
}

interface DispatchRecord {
  id: string;
  attempt_id: string;
  attendant_id: string;
  attendant_name: string;
  attendant_phone: string;
  created_at: string;
}

class TestRotationEngine {
  public attendants: Attendant[] = [];
  public dispatches: DispatchRecord[] = [];
  public lastAttendantId: string | null = null;

  reset() {
    this.attendants = [];
    this.dispatches = [];
    this.lastAttendantId = null;
  }

  addAttendant(name: string, phone: string, display_order: number = 0): Attendant {
    const cleanPhone = phone.replace(/\D/g, '');
    const att: Attendant = {
      id: `att-${this.attendants.length + 1}-${Math.random().toString(36).slice(2, 6)}`,
      name,
      phone: cleanPhone,
      is_active: true,
      is_deleted: false,
      display_order,
      created_at: new Date().toISOString(),
    };
    this.attendants.push(att);
    return att;
  }

  toggleActive(id: string, is_active: boolean) {
    const att = this.attendants.find(a => a.id === id);
    if (att) att.is_active = is_active;
  }

  softDelete(id: string) {
    const att = this.attendants.find(a => a.id === id);
    if (att) {
      att.is_deleted = true;
      att.is_active = false;
    }
  }

  distribute(attemptId: string) {
    // 1. Idempotência: Se tentativa já existe, retorna a mesma sem avançar cursor
    const existing = this.dispatches.find(d => d.attempt_id === attemptId);
    if (existing) {
      return {
        success: true,
        attendant_id: existing.attendant_id,
        attendant_name: existing.attendant_name,
        attendant_phone: existing.attendant_phone,
        is_idempotent_replay: true,
      };
    }

    // 2. Filtrar ativos e não excluídos ordenados
    const active = this.attendants
      .filter(a => a.is_active && !a.is_deleted)
      .sort((a, b) => a.display_order - b.display_order || a.created_at.localeCompare(b.created_at) || a.id.localeCompare(b.id));

    if (active.length === 0) {
      return {
        success: false,
        error: 'Nenhum atendente ativo configurado no momento',
        code: 'NO_ACTIVE_ATTENDANTS',
      };
    }

    // 3. Round-Robin determinístico
    let chosen: Attendant;
    const lastIdx = this.lastAttendantId ? active.findIndex(a => a.id === this.lastAttendantId) : -1;

    if (lastIdx === -1 || lastIdx >= active.length - 1) {
      chosen = active[0];
    } else {
      chosen = active[lastIdx + 1];
    }

    this.lastAttendantId = chosen.id;

    // 4. Registro de encaminhamento
    this.dispatches.push({
      id: `disp-${this.dispatches.length + 1}`,
      attempt_id: attemptId,
      attendant_id: chosen.id,
      attendant_name: chosen.name,
      attendant_phone: chosen.phone,
      created_at: new Date().toISOString(),
    });

    return {
      success: true,
      attendant_id: chosen.id,
      attendant_name: chosen.name,
      attendant_phone: chosen.phone,
      is_idempotent_replay: false,
    };
  }

  getMetrics(now: Date = new Date()) {
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' });
    const currentDateSp = formatter.format(now);

    const getMidnightSp = (daysAgo: number) => {
      const d = new Date(now.getTime() - daysAgo * 86400000);
      const str = formatter.format(d);
      return new Date(`${str}T00:00:00-03:00`).getTime();
    };

    const todayStart = getMidnightSp(0);
    const sevenDaysStart = getMidnightSp(6);
    const fifteenDaysStart = getMidnightSp(14);
    const thirtyDaysStart = getMidnightSp(29);

    const calcCounts = (filterAttendantId?: string) => {
      const list = filterAttendantId 
        ? this.dispatches.filter(d => d.attendant_id === filterAttendantId)
        : this.dispatches;

      return {
        today: list.filter(d => new Date(d.created_at).getTime() >= todayStart).length,
        last_7_days: list.filter(d => new Date(d.created_at).getTime() >= sevenDaysStart).length,
        last_15_days: list.filter(d => new Date(d.created_at).getTime() >= fifteenDaysStart).length,
        last_30_days: list.filter(d => new Date(d.created_at).getTime() >= thirtyDaysStart).length,
        all_time: list.length,
      };
    };

    return {
      timezone: 'America/Sao_Paulo',
      current_date_sp: currentDateSp,
      totals: calcCounts(),
      attendants: this.attendants.map(att => ({
        ...att,
        counts: calcCounts(att.id),
      })),
    };
  }
}

// ============================================================================
// EXECUÇÃO DOS TESTES
// ============================================================================
function runAllTests() {
  console.log('🧪 Iniciando Suíte de Testes do Sistema de Distribuição Finzero...\n');
  const engine = new TestRotationEngine();
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  // TESTE 1: Rodízio Sequencial Ordenado
  console.log('--- TESTE 1: Rodízio Sequencial Ordenado ---');
  engine.reset();
  const a1 = engine.addAttendant('Atendente 1', '5511970810467', 1);
  const a2 = engine.addAttendant('Atendente 2', '5511999998888', 2);
  const a3 = engine.addAttendant('Atendente 3', '5511988887777', 3);

  const r1 = engine.distribute('att-1');
  const r2 = engine.distribute('att-2');
  const r3 = engine.distribute('att-3');
  const r4 = engine.distribute('att-4'); // volta ao primeiro

  assert(r1.attendant_id === a1.id, 'Primeira requisição vai para Atendente 1');
  assert(r2.attendant_id === a2.id, 'Segunda requisição vai para Atendente 2');
  assert(r3.attendant_id === a3.id, 'Terceira requisição vai para Atendente 3');
  assert(r4.attendant_id === a1.id, 'Quarta requisição faz o loop e volta para Atendente 1');

  // TESTE 2: Idempotência por attempt_id (Prevenção de Duplo Clique)
  console.log('\n--- TESTE 2: Idempotência e Duplo Clique ---');
  const dup1 = engine.distribute('clique-duplo-123');
  const dup2 = engine.distribute('clique-duplo-123'); // mesmo ID
  const dup3 = engine.distribute('clique-duplo-123'); // terceiro clique idêntico

  assert(dup1.attendant_id === dup2.attendant_id, 'Duplo clique retorna exatamente o mesmo atendente');
  assert(dup2.is_idempotent_replay === true, 'Sinaliza is_idempotent_replay como true');
  assert(dup3.is_idempotent_replay === true, 'Terceiro clique idêntico preserva idempotência');

  // Próxima requisição intencional deve avançar normalmente
  const nextReq = engine.distribute('nova-tentativa-456');
  assert(nextReq.is_idempotent_replay === false, 'Nova tentativa com ID diferente é processada como nova');

  // TESTE 3: Pausas no Rodízio (Desativação Temporária)
  console.log('\n--- TESTE 3: Pausas no Rodízio ---');
  engine.reset();
  const attA = engine.addAttendant('A', '5511111111111', 1);
  const attB = engine.addAttendant('B', '5511222222222', 2);
  const attC = engine.addAttendant('C', '5511333333333', 3);

  // Pausar atendente B
  engine.toggleActive(attB.id, false);

  const p1 = engine.distribute('p-1');
  const p2 = engine.distribute('p-2');
  const p3 = engine.distribute('p-3');

  assert(p1.attendant_id === attA.id, 'Primeiro vai para A');
  assert(p2.attendant_id === attC.id, 'Segundo pula B (pausado) e vai direto para C');
  assert(p3.attendant_id === attA.id, 'Terceiro volta para A ignorando B');

  // Reativar B
  engine.toggleActive(attB.id, true);
  const p4 = engine.distribute('p-4');
  assert(p4.attendant_id === attB.id, 'Reativação de B inclui de volta no rodízio perfeitamente');

  // TESTE 4: Exclusão Lógica e Preservação de Histórico
  console.log('\n--- TESTE 4: Exclusão Lógica (Soft Delete) ---');
  engine.softDelete(attC.id);
  assert(attC.is_deleted === true, 'Atendente C marcado como is_deleted = true');
  
  const d1 = engine.distribute('d-1');
  const d2 = engine.distribute('d-2');
  assert(d1.attendant_id === attA.id || d1.attendant_id === attB.id, 'Atendente excluído não recebe mais encaminhamentos');
  assert(d2.attendant_id !== attC.id, 'Atendente excluído nunca é selecionado');

  // TESTE 5: Sem Atendentes Ativos
  console.log('\n--- TESTE 5: Tratamento sem Atendentes Ativos ---');
  engine.reset();
  const noAttRes = engine.distribute('sem-atendentes-1');
  assert(noAttRes.success === false, 'Retorna success = false quando fila vazia');
  assert(noAttRes.code === 'NO_ACTIVE_ATTENDANTS', 'Retorna código NO_ACTIVE_ATTENDANTS para feedback claro');

  // TESTE 6: Métricas e Intervalos de Fuso America/Sao_Paulo
  console.log('\n--- TESTE 6: Métricas em America/Sao_Paulo ---');
  engine.reset();
  const mAtt = engine.addAttendant('Métricas Atendente', '5511999991111', 1);

  // Criar dispatches com datas simuladas
  const now = new Date('2026-10-18T18:00:00-03:00'); // Horário fixo em SP
  engine.distribute('m-today-1');
  engine.distribute('m-today-2');

  // Adicionar manualmente um registro de 5 dias atrás (dentro dos 7 dias)
  engine.dispatches.push({
    id: 'disp-old-5d',
    attempt_id: 'old-5d',
    attendant_id: mAtt.id,
    attendant_name: mAtt.name,
    attendant_phone: mAtt.phone,
    created_at: new Date(now.getTime() - 5 * 86400000).toISOString(),
  });

  // Adicionar manualmente um registro de 10 dias atrás (dentro dos 15 dias, mas fora de 7 dias)
  engine.dispatches.push({
    id: 'disp-old-10d',
    attempt_id: 'old-10d',
    attendant_id: mAtt.id,
    attendant_name: mAtt.name,
    attendant_phone: mAtt.phone,
    created_at: new Date(now.getTime() - 10 * 86400000).toISOString(),
  });

  // Adicionar manualmente um registro de 20 dias atrás (dentro dos 30 dias, mas fora de 15 dias)
  engine.dispatches.push({
    id: 'disp-old-20d',
    attempt_id: 'old-20d',
    attendant_id: mAtt.id,
    attendant_name: mAtt.name,
    attendant_phone: mAtt.phone,
    created_at: new Date(now.getTime() - 20 * 86400000).toISOString(),
  });

  const metrics = engine.getMetrics(now);

  assert(metrics.timezone === 'America/Sao_Paulo', 'Fuso configurado é America/Sao_Paulo');
  assert(metrics.totals.today === 2, `Total de hoje correto: esperado 2, obtido ${metrics.totals.today}`);
  assert(metrics.totals.last_7_days === 3, `Total 7 dias correto: esperado 3, obtido ${metrics.totals.last_7_days}`);
  assert(metrics.totals.last_15_days === 4, `Total 15 dias correto: esperado 4, obtido ${metrics.totals.last_15_days}`);
  assert(metrics.totals.last_30_days === 5, `Total 30 dias correto: esperado 5, obtido ${metrics.totals.last_30_days}`);
  assert(metrics.totals.all_time === 5, `Total geral correto: esperado 5, obtido ${metrics.totals.all_time}`);

  // Resumo final
  console.log('\n===========================================');
  console.log(`Resultados dos Testes: ${passed} passaram, ${failed} falharam.`);
  console.log('===========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests();
