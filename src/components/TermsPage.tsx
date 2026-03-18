import React from 'react';

export function TermsPage() {
  return (
    <div className="p-6 min-h-screen">
      <h1 className="text-3xl font-bold mb-8 bg-clip-text text-transparent bg-gradient-to-r from-gray-800 to-gray-600">Términos y Condiciones de Uso</h1>
      <div className="glass-panel rounded-2xl p-8">
        <p className="text-sm text-gray-500">Aplicación Web: Fondos Recuperados Base De Datos</p>
        <p className="text-sm text-gray-500">Desarrollada por A.P Company ©</p>
        <p className="text-sm text-gray-500 mb-6">Última actualización: 9/5/2025</p>
        <div className="space-y-4 text-gray-700 leading-relaxed">
          <div>
            <p className="font-semibold text-gray-800">1. Aceptación de los Términos</p>
            <p>El acceso y uso de la aplicación web "Fondos Recuperados Base De Datos", en adelante la Aplicación, implica la aceptación plena de los presentes términos y condiciones por parte del usuario. Si el usuario no está de acuerdo con estos términos, deberá abstenerse de utilizar la Aplicación.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-800">2. Usuarios Autorizados</p>
            <p>La Aplicación está destinada exclusivamente al personal autorizado del área de Administración de la Región Sanitaria Departamental de Cortés, entidad gubernamental de Honduras. El acceso está restringido mediante autenticación con credenciales proporcionadas por la entidad.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-800">3. Funcionalidad del Sistema</p>
            <p>La Aplicación permite:</p>
            <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
              <li>El registro, edición y eliminación de datos financieros (ingresos, egresos y cortes de dinero) de los establecimientos de salud.</li>
              <li>La generación de informes, gráficos y estadísticas para fines administrativos y de control interno.</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-gray-800">4. Responsabilidad del Usuario</p>
            <p>El usuario se compromete a:</p>
            <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
              <li>Utilizar la Aplicación únicamente para los fines autorizados por la Región Sanitaria Departamental de Cortés.</li>
              <li>Ingresar únicamente información verificada, veraz y válida.</li>
              <li>Abstenerse de modificar, alterar o eliminar información con intenciones fraudulentas o que puedan perjudicar a la institución o al gobierno de Honduras.</li>
            </ul>
            <p className="mt-2">Cualquier mal uso de la Aplicación será responsabilidad exclusiva del usuario, quedando A.P Company exenta de cualquier consecuencia derivada.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-800">5. Propiedad de la Información</p>
            <p>Toda la información almacenada en la Aplicación es propiedad única y exclusiva de la Región Sanitaria Departamental de Cortés. A.P Company no tiene ningún derecho de uso, acceso externo, reproducción o modificación de dicha información, ni se hace responsable por la eliminación accidental o intencionada de datos por parte del personal de la entidad.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-800">6. Limitación de Responsabilidad</p>
            <p>A.P Company no será responsable por:</p>
            <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
              <li>Errores cometidos por los usuarios al ingresar información.</li>
              <li>Pérdida de datos por mal uso o negligencia de los usuarios.</li>
              <li>Consecuencias administrativas, legales o financieras derivadas del uso de la Aplicación por parte del personal de la Región Sanitaria.</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-gray-800">7. Mantenimiento y Soporte Técnico</p>
            <p>A.P Company brinda:</p>
            <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
              <li>Soporte técnico inmediato ante fallos técnicos o dudas de uso.</li>
              <li>Actualizaciones periódicas para asegurar el correcto funcionamiento del sistema.</li>
            </ul>
            <p className="mt-2">Sin embargo, A.P Company se reserva el derecho de finalizar el soporte y las actualizaciones de la Aplicación previa notificación escrita a la Región Sanitaria.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-800">8. Seguridad de la Información</p>
            <p>La Aplicación:</p>
            <ul className="list-disc list-inside ml-5 mt-1 space-y-1">
              <li>No recolecta datos personales.</li>
              <li>Está diseñada con mecanismos de seguridad que garantizan la integridad y protección de los datos almacenados.</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-gray-800">9. Modificaciones a los Términos</p>
            <p>Estos términos podrán ser modificados por A.P Company en cualquier momento. Las nuevas versiones serán notificadas al correo institucional correspondiente antes de su entrada en vigencia.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-800">10. Legislación Aplicable y Jurisdicción</p>
            <p>Este acuerdo se regirá por las leyes vigentes en la República de Honduras. Cualquier controversia será resuelta por los tribunales competentes del país.</p>
          </div>
          <div>
            <p className="font-semibold text-gray-800">11. Contacto</p>
            <p>Para soporte técnico o consultas sobre estos términos, puede contactarse a:</p>
            <p><a href="mailto:a.p.companyentertaiment@gmail.com" className="text-indigo-600 hover:text-indigo-700">a.p.companyentertaiment@gmail.com</a></p>
          </div>
          <div className="mt-6 flex justify-center">
            <img src="https://i.imgur.com/xuE4EiP.jpeg" alt="Información Adicional o Sello" style={{ maxWidth: '200px', maxHeight: '150px' }} />
          </div>
        </div>
      </div>
    </div>
  );
}
