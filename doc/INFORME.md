## ReadMe

### **Descripción de la Aplicación**

La aplicación *ReadMe* tiene como objetivo es ofrecer a los usuarios un espacio donde puedan:

* Consultar libros disponibles en el sistema.
* Registrar y hacer seguimiento de sus lecturas personales.
* Participar en clubes de lectura temáticos.
* Interactuar con otros lectores mediante debates y estadísticas de lectura.

El sistema implementa un modelo de roles con diferentes permisos: **Administrador** y **Usuario**.

---

## **Funcionalidades**

### **Login**

Permite que los usuarios registrados accedan al sistema ingresando sus credenciales (email y contraseña).

* Validación de credenciales.
* Generación de token de sesión (JWT, por ejemplo).
* Acceso personalizado según el rol del usuario.

### **Logout**

Permite cerrar la sesión activa del usuario, invalidando su token o eliminando su sesión actual.

* Cierre seguro de sesión.

---


El administrador tiene control total sobre la gestión del sistema, usuarios y libros. Este, además de las acciones de autenticación,  tiene acceso privilegiado a funcionalidades como las siguientes:

### **1. Registrar libros**

* Crea nuevos registros de libros en la base de datos.
* Incluye campos como título, autor, género, sinopsis, portada, año, editorial, etc.

### **2. Registrar usuarios**

* Permite crear usuarios manualmente (por ejemplo, en entornos de administración).
* Define datos básicos: nombre, correo, contraseña y rol.

### **3. Asignar roles**

* Cambia el rol de un usuario existente (usuario → moderador, etc.).
* Control de permisos según jerarquía del sistema.

### **4. Eliminar usuarios**

* Elimina usuarios del sistema, incluyendo su historial de lecturas o participación en clubes.
* Validación previa para evitar eliminación accidental.

### **5. Añadir libros**

* Función similar a “Registrar libros”, pero puede usarse como parte del mantenimiento o actualización del catálogo.

### **6. Editar libros**

* Permite modificar los datos de un libro existente.
* Uso común para corregir información o actualizar portadas.

### **7. Eliminar libros**

* Remueve libros del catálogo.
* Verificación para evitar eliminar libros vinculados a clubes de lectura activos.

### **10. Ver estadísticas**

* Muestra métricas generales, como:

  * Libros más leídos
  * Libros más recomendados

---

El usuario representa al lector común que accede a la plataforma para descubrir, leer y compartir su experiencia lectora. Este, además de las acciones de autenticación, tiene acceso a las siguientes funcionalidades:

### **1. Registrarse**

* Permite crear una cuenta en la plataforma.
* Se almacenan datos básicos (nombre, correo, contraseña).
* El rol asignado por defecto es “Usuario”.

### **2. Ver libros**

* Muestra el catálogo general de libros registrados.
* Incluye filtros (por género, autor, título, etc.).
* Permite ver detalles individuales de cada libro.

### **3. Empezar a leer un libro**

* Registra el inicio de una lectura.
* Asocia el libro con el usuario en su perfil de lectura.
* Permite establecer estado (por leer, en progreso, terminado).

### **4. Editar su lectura de libro**

* Permite actualizar el progreso o estado de una lectura.
* Por ejemplo: cambiar páginas leídas, calificación, o estado final.

### **5. Eliminar su lectura de libro**

* Elimina el registro de lectura del usuario sin afectar el libro globalmente.

### **6. Ver clubes de lectura**

* Lista todos los clubes disponibles en la plataforma.
* Permite acceder a detalles de cada club: nombre, libro asociado, moderador, miembros.

### **7. Unirse a clubes de lectura**

* Envía solicitud o se une directamente a un club activo.
* Agrega al usuario al grupo de miembros del club.

### **8. Abrir un debate en un club de lectura**

* Permite a los miembros de un club crear un nuevo hilo de debate sobre el libro o temas relacionados.
* Incluye título del debate y primer mensaje.

### **9. Debatir en un club**

* Permite participar en los debates existentes, respondiendo o comentando.
* Se registra el autor y la fecha del mensaje.


---


El moderador, si bien no esta definido como un rol, es un usuario de la aplicación que crea un club y puede gestionar los clubes de lectura y mantiene el orden en los debates.

### **1. Crear un club de lectura**

* Crea un nuevo club, asociándolo a un libro específico.
* Define nombre, descripción, libro asociado y reglas básicas.
* Automáticamente se asigna como moderador del club.

### **2. Editar un club de lectura**

* Permite actualizar la información del club (por ejemplo, descripción, fechas o libro asociado).

### **3. Eliminar un club de lectura**

* Permite cerrar y eliminar un club existente.
* Se eliminan también los debates asociados.


