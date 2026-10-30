import React from 'react';
import { SectionCard, SingleSeriesBarChart } from './ChartCard';

const EditingAvgChart = ({ data }) => (
  <SectionCard title="Tiempo de entrega por formato" description="Promedio de días entre el inicio y la entrega (proyectos completados)">
    <SingleSeriesBarChart
      data={data}
      xKey="type"
      yKey="avgDays"
      allowDecimals
      emptyMessage="Sin datos de entrega"
      formatValue={(value, row) => `${value} días · ${row.count} ${row.count === 1 ? 'proyecto' : 'proyectos'}`}
    />
  </SectionCard>
);

export default EditingAvgChart;
