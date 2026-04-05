# Ergos Continental — Interactive Prototype Features

## English

### Booking Flow (11 screens)

**1. Home / Search**
- Unified search field accepting destination, city, region, or hotel name with autocomplete
- Date picker with automatic night count calculation
- Multi-room occupancy selector with Adults + Children per room
- Trending destinations quick-access chips
- Skeleton loading animation during search

**2. Search Results**
- Hotel cards showing meal plan, cancellation policy, and starting price upfront
- Sidebar filters: star rating, price range, meal plan, cancellation policy
- Sort options (price, rating, name)
- Dynamic result count and empty state when filters match nothing

**3. Hotel Detail**
- Dynamic hotel name and star rating based on selected hotel
- Photo gallery with grid layout
- Hotel description, highlights, and amenities
- Review score display
- Available rooms with multiple rate options per room type (meal plan + cancellation policy combinations)
- Virtual tour button (placeholder)

**4. Guest Info**
- Lead guest form: first name, last name, email
- Special requests field
- Terms acceptance

**5. Add Services (Cross-Sell at Checkout)**
- Airport transfer cross-sell with auto-filled pickup/drop-off and dates from the hotel booking
- Transfer mode selector: One Way / Round Trip
- Round trip reveals return date and return time fields
- Vehicle search with 6 vehicle options (shuttle, sedan, SUV, van, minibus, luxury)
- Vehicle cards showing net price, sell price, capacity, supplier, and refund policy
- Sort vehicles by price or capacity
- Add/remove transfer with running price update
- Markup preview for agency margin
- Skip option to proceed without services

**6. Payment**
- Order summary with hotel details and transfer breakdown (when applicable)
- Combined "Trip Summary" header when transfer is added
- Payment method selection
- Price breakdown showing accommodation subtotal + transfer subtotal

**7. Confirmation**
- Dynamic booking reference generation
- Confetti celebration animation
- Full booking summary with hotel, room, dates, guest, and price
- Transfer section with route, vehicle, date/time, and passengers (when applicable)
- Price breakdown for combined bookings
- Email confirmation button
- Direct link to booking details

**8. My Bookings**
- Dynamic booking list that accumulates all confirmed bookings across sessions
- Each card shows: hotel name, status badge (Confirmed/Cancelled), refund policy, dates, nights, guests, meal plan, price, and booking reference
- Combined trip bookings display transfer info
- Past bookings persist when new bookings are created
- Demo bookings for cancelled booking examples
- View Booking Details button per entry

**9. Booking Detail**
- Full booking information: hotel, room, meal plan, dates, duration, price
- Transfer section with route, vehicle, date, time, passengers, and price (when applicable)
- Price breakdown (accommodation + transfer) for combined bookings
- Booking timeline (Confirmed, Modified, Cancelled entries)
- Modify Booking and Cancel Booking action buttons
- Status badge and cancellation banner

**10. Voucher Preview**
- Printable/downloadable hotel voucher
- Transfer details included when applicable
- Language switching (English / Spanish)
- Combined price summary for trip bookings
- Download as PDF button

**11. Invoice Preview**
- Professional invoice layout with line items
- Accommodation and transfer as separate line items
- Subtotals per service + combined total
- Language switching (English / Spanish)
- Download as PDF button

---

### Modify Booking Modal
- Change check-in and check-out dates
- Multi-room management: add up to 5 rooms, remove rooms, per-room meal plan selection
- Transfer modification: change transfer date, pickup time, and passengers
- One Way / Round Trip mode toggle with return date/time fields
- Read-only vehicle and route info (change requires re-adding from services)
- Live total recalculation including transfer price
- Changes reflected in booking detail, voucher, invoice, and My Bookings list

### Cancel Booking Flow (2-step)
- Step 1: Cancellation policy review with tiered penalty timeline, refund calculation, and booking summary
- Step 2: Cancellation reason (required), confirmation checkbox, final confirm
- Cancelled status reflected across booking detail, My Bookings, and timeline

### Additional Features
- **Language switching**: English/Spanish toggle on vouchers and invoices
- **Markup settings screen**: Configure agency markup percentages
- **Responsive design**: Adapts to different screen sizes
- **Toast notifications**: Success/info/error feedback throughout the flow
- **Dynamic night calculation**: Auto-updates on date changes
- **Autocomplete search**: Destination suggestions with keyboard navigation

---
---

## Español

### Flujo de Reserva (11 pantallas)

**1. Inicio / Búsqueda**
- Campo de búsqueda unificado que acepta destino, ciudad, región o nombre del hotel con autocompletado
- Selector de fechas con cálculo automático del número de noches
- Selector de ocupación multi-habitación con Adultos + Niños por habitación
- Chips de acceso rápido a destinos populares
- Animación de carga tipo skeleton durante la búsqueda

**2. Resultados de Búsqueda**
- Tarjetas de hotel mostrando plan de comidas, política de cancelación y precio desde el inicio
- Filtros laterales: categoría de estrellas, rango de precio, plan de comidas, política de cancelación
- Opciones de ordenar (precio, puntuación, nombre)
- Contador dinámico de resultados y estado vacío cuando los filtros no encuentran coincidencias

**3. Detalle del Hotel**
- Nombre del hotel y categoría de estrellas dinámicos según el hotel seleccionado
- Galería de fotos con diseño en cuadrícula
- Descripción del hotel, aspectos destacados y servicios
- Puntuación de reseñas
- Habitaciones disponibles con múltiples opciones de tarifa por tipo de habitación (combinaciones de plan de comidas + política de cancelación)
- Botón de tour virtual (placeholder)

**4. Información del Huésped**
- Formulario del huésped principal: nombre, apellido, correo electrónico
- Campo de solicitudes especiales
- Aceptación de términos

**5. Agregar Servicios (Venta Cruzada en el Checkout)**
- Venta cruzada de transfer aeroportuario con recogida/destino y fechas auto-completados desde la reserva del hotel
- Selector de modo de transfer: Solo Ida / Ida y Vuelta
- Ida y Vuelta muestra campos de fecha y hora de regreso
- Búsqueda de vehículos con 6 opciones (shuttle, sedán, SUV, van, minibús, lujo)
- Tarjetas de vehículos mostrando precio neto, precio de venta, capacidad, proveedor y política de reembolso
- Ordenar vehículos por precio o capacidad
- Agregar/eliminar transfer con actualización de precio en tiempo real
- Vista previa del markup para el margen de la agencia
- Opción de omitir para continuar sin servicios

**6. Pago**
- Resumen del pedido con detalles del hotel y desglose del transfer (cuando aplica)
- Encabezado combinado "Resumen del Viaje" cuando se agrega transfer
- Selección de método de pago
- Desglose de precios mostrando subtotal de alojamiento + subtotal de transfer

**7. Confirmación**
- Generación dinámica de referencia de reserva
- Animación de celebración con confeti
- Resumen completo de la reserva con hotel, habitación, fechas, huésped y precio
- Sección de transfer con ruta, vehículo, fecha/hora y pasajeros (cuando aplica)
- Desglose de precios para reservas combinadas
- Botón de confirmación por correo electrónico
- Enlace directo a los detalles de la reserva

**8. Mis Reservas**
- Lista dinámica de reservas que acumula todas las reservas confirmadas durante la sesión
- Cada tarjeta muestra: nombre del hotel, estado (Confirmada/Cancelada), política de reembolso, fechas, noches, huéspedes, plan de comidas, precio y referencia
- Las reservas combinadas (viaje) muestran información del transfer
- Las reservas anteriores se conservan al crear nuevas reservas
- Reservas demo para ejemplos de reservas canceladas
- Botón de Ver Detalles por cada entrada

**9. Detalle de la Reserva**
- Información completa: hotel, habitación, plan de comidas, fechas, duración, precio
- Sección de transfer con ruta, vehículo, fecha, hora, pasajeros y precio (cuando aplica)
- Desglose de precios (alojamiento + transfer) para reservas combinadas
- Línea de tiempo de la reserva (entradas de Confirmada, Modificada, Cancelada)
- Botones de acción: Modificar Reserva y Cancelar Reserva
- Indicador de estado y banner de cancelación

**10. Vista Previa del Voucher**
- Voucher de hotel imprimible/descargable
- Detalles del transfer incluidos cuando aplica
- Cambio de idioma (Inglés / Español)
- Resumen de precios combinados para reservas de viaje
- Botón de descarga en PDF

**11. Vista Previa de Factura**
- Diseño profesional de factura con líneas de detalle
- Alojamiento y transfer como partidas separadas
- Subtotales por servicio + total combinado
- Cambio de idioma (Inglés / Español)
- Botón de descarga en PDF

---

### Modal de Modificación de Reserva
- Cambiar fechas de check-in y check-out
- Gestión multi-habitación: agregar hasta 5 habitaciones, eliminar habitaciones, selección de plan de comidas por habitación
- Modificación del transfer: cambiar fecha, hora de recogida y pasajeros
- Selector de modo Solo Ida / Ida y Vuelta con campos de fecha/hora de regreso
- Información de vehículo y ruta de solo lectura (el cambio requiere volver a agregar desde servicios)
- Recálculo del total en tiempo real incluyendo precio del transfer
- Los cambios se reflejan en el detalle de la reserva, voucher, factura y lista de Mis Reservas

### Flujo de Cancelación (2 pasos)
- Paso 1: Revisión de política de cancelación con línea de tiempo de penalidades, cálculo de reembolso y resumen de la reserva
- Paso 2: Motivo de cancelación (obligatorio), casilla de confirmación, confirmación final
- El estado cancelado se refleja en el detalle de la reserva, Mis Reservas y la línea de tiempo

### Funcionalidades Adicionales
- **Cambio de idioma**: Alternancia Inglés/Español en vouchers y facturas
- **Pantalla de configuración de markup**: Configurar porcentajes de markup de la agencia
- **Diseño responsivo**: Se adapta a diferentes tamaños de pantalla
- **Notificaciones toast**: Retroalimentación de éxito/información/error en todo el flujo
- **Cálculo dinámico de noches**: Se actualiza automáticamente al cambiar fechas
- **Búsqueda con autocompletado**: Sugerencias de destinos con navegación por teclado
