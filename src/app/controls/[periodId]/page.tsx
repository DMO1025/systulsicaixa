
"use client";

import React, { useState } from 'react';
import { useParams as useNextParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import type { PeriodId } from '@/lib/types';
import { useDailyEntryForm } from '@/hooks/useDailyEntryForm';
import { PERIOD_DEFINITIONS } from '@/lib/config/periods';
import { PERIOD_FORM_CONFIG } from '@/lib/config/forms';

// Import all possible control form components
import ControleCafeDaManhaForm from '@/components/period-forms/ControleCafeDaManhaForm';
import CafeManhaNoShowForm from '@/components/period-forms/CafeManhaNoShowForm';
import ControleFrigobarForm from '@/components/period-forms/ControleFrigobarForm';


const CONTROL_FORM_COMPONENTS: Record<string, React.ComponentType<any>> = {
  controleCafeDaManha: ControleCafeDaManhaForm,
  cafeManhaNoShow: CafeManhaNoShowForm,
  controleFrigobar: ControleFrigobarForm,
};

export default function ControlPeriodPage() {
  const params = useNextParams();
  const activePeriodId = params.periodId as PeriodId;
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const {
    form,
    isDataLoading,
    activePeriodDefinition,
    activePeriodConfig,
    triggerMainSubmit,
  } = useDailyEntryForm(activePeriodId);

  const ControlFormComponent = CONTROL_FORM_COMPONENTS[activePeriodId];

  if (isDataLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!activePeriodDefinition || !ControlFormComponent) {
    return (
      <div className="text-center py-10">
        <h1 className="text-xl font-bold text-destructive">Erro de Configuração</h1>
        <p className="text-muted-foreground">O formulário de controle para '{activePeriodId}' não foi encontrado.</p>
      </div>
    );
  }
  
  const formProps = {
    form,
    periodId: activePeriodId,
    periodDefinition: activePeriodDefinition,
    periodConfig: activePeriodConfig,
    selectedMonth,
    setSelectedMonth,
    triggerMainSubmit,
    isMainFormLoading: isDataLoading,
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">{activePeriodDefinition.label}</h1>
      <ControlFormComponent {...formProps} />
    </div>
  );
}
