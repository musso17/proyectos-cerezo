import React, { useState } from 'react';
import { Search, DollarSign, Video, Camera, Edit, TrendingUp, Package, Users } from 'lucide-react';

const AudiovisualDatabase = () => {
  const [activeTab, setActiveTab] = useState('servicios');
  const [searchTerm, setSearchTerm] = useState('');

  // Base de datos de servicios
  const servicios = {
    registro: [
      { nombre: 'Registro video media jornada (4h)', costo: 1300, unidad: 'jornada', refs: ['CHERY', 'CHERY nuevo'], rango: '1300-1600' },
      { nombre: 'Registro fotografía media jornada (4h)', costo: 900, unidad: 'jornada', refs: ['CHERY nuevo'] },
      { nombre: 'Registro video jornada completa (8h)', costo: 900, unidad: 'día', refs: ['Artidoro', 'Convención FUSO', 'Chamberas'], rango: '900-950' },
      { nombre: 'Registro video fuera de Lima (3-4 días)', costo: 2000, unidad: 'viaje', refs: ['Artidoro'] },
      { nombre: 'Registro video documental (5 días)', costo: 5000, unidad: 'proyecto', refs: ['Enseña Perú'] },
      { nombre: 'Registro drone (1 día)', costo: 1500, unidad: 'día', refs: ['Juan Dasso'] },
      { nombre: 'Registro video 2-3h', costo: 625, unidad: 'sesión', refs: ['Henry', 'FUSO oct', 'Mitsubishi'], rango: '500-800' },
      { nombre: 'Registro video 4-5h', costo: 700, unidad: 'sesión', refs: ['FUSO Canter', 'CoCrea+'], rango: '600-800' },
      { nombre: 'Registro video 2 cámaras (1-2h)', costo: 600, unidad: 'jornada', refs: ['DHL'] },
      { nombre: 'Registro video 1 cámara (1-2h)', costo: 400, unidad: 'jornada', refs: ['DHL'] },
      { nombre: 'Sesión video y foto producto (4-6h)', costo: 800, unidad: 'día', refs: ['Taruka'] },
      { nombre: 'Registro foto y video 2 días', costo: 800, unidad: 'proyecto', refs: ['Tony Acha', 'Sanchi Café', 'JC Ford', 'Monkeyfit'], rango: '600-900' },
      { nombre: 'Registro foto y video 4 días', costo: 625, unidad: 'día', refs: ['GY Service Paracas'] },
      { nombre: '2 sesiones full day + 2 eventos', costo: 2500, unidad: 'paquete', refs: ['DUAL'] }
    ],
    edicion: [
      { nombre: 'Edición video 45s', costo: 300, unidad: 'video', refs: ['CHERY'] },
      { nombre: 'Edición video 1min', costo: 250, unidad: 'video', refs: ['Chamberas'] },
      { nombre: 'Edición video 1-2min', costo: 400, unidad: 'video', refs: ['Artidoro'] },
      { nombre: 'Edición video 2-3min', costo: 900, unidad: 'video', refs: ['Kenny V.'] },
      { nombre: 'Edición video 3-4min', costo: 600, unidad: 'video', refs: ['DHL'] },
      { nombre: 'Edición video 30s (c/gráficas)', costo: 600, unidad: 'video', refs: ['Mitsubishi'] },
      { nombre: 'Edición cápsula corta', costo: 112.5, unidad: 'video', refs: ['FUSO - promedio'] },
      { nombre: 'Edición 4 reels', costo: 400, unidad: 'paquete', refs: ['Taruka'] },
      { nombre: 'Edición 6 reels', costo: 600, unidad: 'paquete', refs: ['Taruka'] }
    ],
    fotografia: [
      { nombre: 'Selección y edición 50 fotos', costo: 500, unidad: 'paquete', refs: ['Taruka'] },
      { nombre: 'Selección y edición 30 fotos', costo: 300, unidad: 'paquete', refs: ['Taruka'] },
      { nombre: 'Selección y retoque (proyecto)', costo: 500, unidad: 'proyecto', refs: ['Kenny V.'] }
    ],
    extras: [
      { nombre: 'Gastos de producción', costo: 250, unidad: 'jornada', refs: ['CHERY'] },
      { nombre: 'Viáticos', costo: 200, unidad: 'viaje', refs: ['FUSO'] },
      { nombre: 'Creación de guión', costo: 0, unidad: 'incluido', refs: ['Continental'] },
      { nombre: 'Sonorización y colorización', costo: 0, unidad: 'incluido', refs: ['Continental'] },
      { nombre: 'Locución + postproducción sonido 30s', costo: 900, unidad: 'video', refs: ['Mitsubishi'] }
    ]
  };

  // Análisis de clientes
  const clientes = [
    {
      nombre: 'CHERY',
      tipo: 'Corporativo - Automotriz',
      proyecto: 'Contenido Digital Tiggo 4 Pro',
      presupuesto: 4600,
      servicios: ['Registro', 'Edición', 'Gastos producción'],
      frecuencia: 'Puntual'
    },
    {
      nombre: 'Continental Travel',
      tipo: 'Corporativo - Turismo',
      proyecto: 'Paquete Mensual',
      presupuesto: 4500,
      servicios: ['Grabación', 'Edición', 'Guión', 'Sonorización'],
      frecuencia: 'Mensual'
    },
    {
      nombre: 'DHL',
      tipo: 'Corporativo - Logística',
      proyecto: 'Voluntariados',
      presupuesto: '3540-4484',
      servicios: ['Registro multicámara', 'Edición múltiple'],
      frecuencia: 'Campaña'
    },
    {
      nombre: 'Taruka',
      tipo: 'E-commerce',
      proyecto: 'Contenido de Producto',
      presupuesto: '1770-2242',
      servicios: ['Foto y video producto', 'Reels', 'Edición foto'],
      frecuencia: 'Recurrente'
    },
    {
      nombre: 'Artidoro',
      tipo: 'Corporativo - Agroindustria',
      proyecto: 'Campaña por etapas',
      presupuesto: 9558,
      servicios: ['Registro fuera Lima', 'Edición campaña'],
      frecuencia: 'Proyecto largo'
    },
    {
      nombre: 'FUSO',
      tipo: 'Corporativo - Automotriz',
      proyecto: 'Videos Carrocerías',
      presupuesto: 1350,
      servicios: ['Registro provincia', 'Cápsulas cortas'],
      frecuencia: 'Puntual'
    }
  ];

  // Paquetes identificados
  const paquetes = [
    {
      nombre: 'Paquete Mensual Básico',
      descripcion: 'Grabación, edición, guión y sonorización',
      precio: 4500,
      incluye: ['Grabación en locación', 'Edición', 'Creación guión', 'Sonorización'],
      cliente: 'Continental Travel'
    },
    {
      nombre: 'Campaña Digital Automotriz',
      descripcion: '2 jornadas registro + 3 videos editados',
      precio: 4600,
      incluye: ['2 media jornadas registro', '3 ediciones 45s', 'Gastos producción'],
      cliente: 'CHERY'
    },
    {
      nombre: 'Contenido Producto E-commerce',
      descripcion: 'Full day foto/video + entregables',
      precio: '1770-2242',
      incluye: ['1 día registro (4-6h)', '4-6 reels', '30-50 fotos editadas'],
      cliente: 'Taruka'
    },
    {
      nombre: 'Cobertura Evento Corporativo',
      descripcion: 'Registro y edición de evento',
      precio: 700,
      incluye: ['Registro 3h foto/video', 'Edición video 1min'],
      cliente: 'Chamberas'
    },
    {
      nombre: 'Campaña Multi-etapa',
      descripcion: 'Proyecto de producción extendido',
      precio: 9558,
      incluye: ['3 viajes fuera Lima', '1 registro Lima', '3 videos 1-2min'],
      cliente: 'Artidoro'
    }
  ];

  // Análisis de precios
  const analisisPrecios = {
    registroPromedio: {
      mediaJornada: 1600,
      jornadeCompleta: 900,
      fueraLima: 2000,
      evento: 450
    },
    edicionPromedio: {
      '30s': 600,
      '1min': 275,
      '1-2min': 400,
      '2-3min': 900,
      '3-4min': 600
    },
    rangosProyecto: {
      pequeño: '700-1500',
      mediano: '1500-4500',
      grande: '4500-10000'
    }
  };

  const renderServicios = () => (
    <div className="space-y-6">
      {Object.entries(servicios).map(([categoria, items]) => (
        <div key={categoria} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-4 py-3">
            <h3 className="text-white font-semibold capitalize flex items-center gap-2">
              {categoria === 'registro' && <Video size={18} />}
              {categoria === 'edicion' && <Edit size={18} />}
              {categoria === 'fotografia' && <Camera size={18} />}
              {categoria === 'extras' && <Package size={18} />}
              {categoria}
            </h3>
          </div>
          <div className="divide-y divide-gray-100">
            {items
              .filter(item => 
                searchTerm === '' || 
                item.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.refs.some(ref => ref.toLowerCase().includes(searchTerm.toLowerCase()))
              )
              .map((item, idx) => (
              <div key={idx} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{item.nombre}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Referencias: {item.refs.join(', ')}
                    </p>
                  </div>
                  <div className="text-right ml-4">
                    <p className="text-lg font-bold text-purple-600">
                      S/. {item.costo.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">por {item.unidad}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderClientes = () => (
    <div className="grid md:grid-cols-2 gap-4">
      {clientes.map((cliente, idx) => (
        <div key={idx} className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-lg transition-shadow">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h3 className="font-bold text-lg text-gray-900">{cliente.nombre}</h3>
              <p className="text-sm text-purple-600">{cliente.tipo}</p>
            </div>
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
              {cliente.frecuencia}
            </span>
          </div>
          <div className="space-y-2 mb-3">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Proyecto:</span> {cliente.proyecto}
            </p>
            <p className="text-sm text-gray-600">
              <span className="font-medium">Presupuesto:</span> S/. {cliente.presupuesto}
            </p>
          </div>
          <div className="flex flex-wrap gap-1">
            {cliente.servicios.map((servicio, i) => (
              <span key={i} className="px-2 py-1 bg-purple-50 text-purple-700 text-xs rounded">
                {servicio}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  const renderPaquetes = () => (
    <div className="grid gap-4">
      {paquetes.map((paquete, idx) => (
        <div key={idx} className="bg-white rounded-lg border border-gray-200 p-5 hover:shadow-lg transition-shadow">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1">
              <h3 className="font-bold text-lg text-gray-900 mb-1">{paquete.nombre}</h3>
              <p className="text-sm text-gray-600">{paquete.descripcion}</p>
            </div>
            <div className="text-right ml-4">
              <p className="text-2xl font-bold text-purple-600">S/. {paquete.precio}</p>
              <p className="text-xs text-gray-500">+ IGV</p>
            </div>
          </div>
          <div className="border-t border-gray-100 pt-3 mt-3">
            <p className="text-xs font-semibold text-gray-500 mb-2">INCLUYE:</p>
            <ul className="space-y-1">
              {paquete.incluye.map((item, i) => (
                <li key={i} className="text-sm text-gray-700 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-purple-500 rounded-full"></span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Cliente referencia: <span className="font-medium">{paquete.cliente}</span>
            </p>
          </div>
        </div>
      ))}
    </div>
  );

  const renderAnalisis = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-6 border border-purple-200">
        <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="text-purple-600" size={20} />
          Análisis de Precios Promedio
        </h3>
        
        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-2">Media Jornada (4h)</p>
            <p className="text-2xl font-bold text-purple-600">S/. 1,600</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-2">Jornada Completa</p>
            <p className="text-2xl font-bold text-purple-600">S/. 900</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-600 mb-2">Fuera de Lima</p>
            <p className="text-2xl font-bold text-purple-600">S/. 2,000</p>
          </div>
        </div>

        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-3">Edición por Duración</h4>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div>
              <p className="text-xs text-gray-500">30s</p>
              <p className="font-bold text-purple-600">S/. 600</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">1min</p>
              <p className="font-bold text-purple-600">S/. 275</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">1-2min</p>
              <p className="font-bold text-purple-600">S/. 400</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">2-3min</p>
              <p className="font-bold text-purple-600">S/. 900</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">3-4min</p>
              <p className="font-bold text-purple-600">S/. 600</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg p-5 border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-3">Proyectos Pequeños</h4>
          <p className="text-3xl font-bold text-green-600 mb-2">S/. 700-1,500</p>
          <p className="text-sm text-gray-600">Eventos, cápsulas cortas</p>
        </div>
        <div className="bg-white rounded-lg p-5 border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-3">Proyectos Medianos</h4>
          <p className="text-3xl font-bold text-blue-600 mb-2">S/. 1,500-4,500</p>
          <p className="text-sm text-gray-600">Contenido mensual, campañas</p>
        </div>
        <div className="bg-white rounded-lg p-5 border border-gray-200">
          <h4 className="font-semibold text-gray-900 mb-3">Proyectos Grandes</h4>
          <p className="text-3xl font-bold text-purple-600 mb-2">S/. 4,500-10,000</p>
          <p className="text-sm text-gray-600">Campañas multi-etapa</p>
        </div>
      </div>

      <div className="bg-white rounded-lg p-5 border border-gray-200">
        <h4 className="font-semibold text-gray-900 mb-4">Insights Clave</h4>
        <ul className="space-y-3">
          <li className="flex items-start gap-3">
            <span className="w-2 h-2 bg-purple-500 rounded-full mt-1.5"></span>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Registro fuera de Lima</span> tiene premium de +122% vs Lima (S/. 2,000 vs S/. 900)
            </p>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-2 h-2 bg-purple-500 rounded-full mt-1.5"></span>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Clientes corporativos</span> (CHERY, DHL, Continental) tienen presupuestos mayores a S/. 3,500
            </p>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-2 h-2 bg-purple-500 rounded-full mt-1.5"></span>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Edición con gráficas</span> duplica el precio base (S/. 600 vs S/. 300)
            </p>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-2 h-2 bg-purple-500 rounded-full mt-1.5"></span>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Paquetes mensuales</span> generan ingresos recurrentes de S/. 4,500
            </p>
          </li>
          <li className="flex items-start gap-3">
            <span className="w-2 h-2 bg-purple-500 rounded-full mt-1.5"></span>
            <p className="text-sm text-gray-700">
              <span className="font-medium">Locución + audio</span> agrega S/. 900 al proyecto (premium service)
            </p>
          </li>
        </ul>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-8 mb-6 text-white shadow-xl">
          <h1 className="text-3xl font-bold mb-2">Base de Datos Audiovisual</h1>
          <p className="text-purple-100">Análisis completo de servicios, clientes y precios</p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Buscar servicios o clientes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'servicios', label: 'Servicios', icon: DollarSign },
            { id: 'clientes', label: 'Clientes', icon: Users },
            { id: 'paquetes', label: 'Paquetes', icon: Package },
            { id: 'analisis', label: 'Análisis', icon: TrendingUp }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-purple-600 text-white shadow-lg'
                  : 'bg-white text-gray-600 hover:bg-gray-100'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div>
          {activeTab === 'servicios' && renderServicios()}
          {activeTab === 'clientes' && renderClientes()}
          {activeTab === 'paquetes' && renderPaquetes()}
          {activeTab === 'analisis' && renderAnalisis()}
        </div>
      </div>
    </div>
  );
};

export default AudiovisualDatabase;