/* =============================================================================
   SECCIÓN 7 — configuración del registro de resultados
   -----------------------------------------------------------------------------
   Rellena estos dos valores para que los intentos de los equipos se guarden en
   la nube. Si los dejas vacíos, el juego funciona igual: cada equipo guarda su
   progreso en su propio navegador y no se registra nada.

   Cómo conseguirlos (una vez, unos cinco minutos):
     1. Entra a https://supabase.com y crea un proyecto.
     2. Abre el editor SQL, pega herramientas/supabase.sql y ejecútalo.
     3. Ve a Project Settings -> API y copia:
          Project URL      -> URL
          anon public key  -> CLAVE
     4. Pega los dos valores aquí abajo y sube el cambio.

   ESTA CLAVE ES PÚBLICA A PROPÓSITO. Viaja dentro de la página y cualquiera
   puede verla; por eso el SQL solo le permite INSERTAR. No pongas aquí la
   clave "service_role": esa lee y borra todo, y va solo en el panel de
   organizadores, que no se publica.
   ========================================================================== */
window.CQ = window.CQ || {};
window.CQ.config = {
  URL: "https://gzepdhrodxylzubahwli.supabase.co",
  CLAVE: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd6ZXBkaHJvZHh5bHp1YmFod2xpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgzMDc4MjcsImV4cCI6MjEwMzg4MzgyN30.lv6Mq6HN0_LEw6Sy7gwXFcmcyBGb3nnzH2jYSfURagE",

  /* Nombre de la competencia, por si corres varias con la misma base. */
  competencia: "Sección 7"
};
