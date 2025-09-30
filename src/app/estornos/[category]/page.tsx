
"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import EstornoForm from '@/components/period-forms/EstornoForm';
import type { EstornoCategory } from '@/lib/types';

export default function EstornoPage() {
  const params = useParams();
  const category = params.category as EstornoCategory;

  return <EstornoForm category={category} />;
}
