CREATE TYPE "public"."estado_liviano" AS ENUM('en_base', 'en_uso', 'taller', 'no_disponible');--> statement-breakpoint
CREATE TYPE "public"."estado_salida" AS ENUM('a_confirmar', 'en_ejecucion', 'finalizado', 'anulado');--> statement-breakpoint
CREATE TYPE "public"."gestion_salida" AS ENUM('permiso_corte', 'traslado_carreton', 'otros');--> statement-breakpoint
CREATE TYPE "public"."resultado_checklist" AS ENUM('sin_novedad', 'con_observacion', 'pendiente');--> statement-breakpoint
CREATE TYPE "public"."rol_salida" AS ENUM('chofer', 'operador_grua', 'jefe_cuadrilla', 'ayudante', 'acompanante');--> statement-breakpoint
CREATE TYPE "public"."rol_usuario" AS ENUM('admin', 'operaciones', 'mantenimiento', 'consulta');--> statement-breakpoint
CREATE TABLE "auditoria" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"usuario_id" integer,
	"entidad" text NOT NULL,
	"entidad_id" integer,
	"accion" text NOT NULL,
	"antes" jsonb,
	"despues" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "checklist_adjuntos" (
	"id" serial PRIMARY KEY NOT NULL,
	"checklist_id" integer NOT NULL,
	"url" text NOT NULL,
	"tipo" text
);
--> statement-breakpoint
CREATE TABLE "checklist_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"checklist_id" integer NOT NULL,
	"item" text NOT NULL,
	"ok" boolean,
	"comentario" text
);
--> statement-breakpoint
CREATE TABLE "checklists" (
	"id" serial PRIMARY KEY NOT NULL,
	"fecha" date NOT NULL,
	"equipo_id" integer,
	"personal_id" integer,
	"telefono" text,
	"resultado" "resultado_checklist" DEFAULT 'pendiente' NOT NULL,
	"observaciones" text,
	"recibido_at" timestamp with time zone,
	"revisado_por" integer,
	"revisado_at" timestamp with time zone,
	"payload" jsonb,
	CONSTRAINT "checklists_fecha_equipo_unq" UNIQUE("fecha","equipo_id")
);
--> statement-breakpoint
CREATE TABLE "clientes" (
	"id" serial PRIMARY KEY NOT NULL,
	"razon_social" text NOT NULL,
	"cuit" text,
	"odoo_id" integer,
	"activo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "clientes_razon_social_unq" UNIQUE("razon_social")
);
--> statement-breakpoint
CREATE TABLE "empresas" (
	"id" serial PRIMARY KEY NOT NULL,
	"codigo" text NOT NULL,
	"razon_social" text NOT NULL,
	"nombre_corto" text NOT NULL,
	"cuit" text,
	"activa" boolean DEFAULT true NOT NULL,
	CONSTRAINT "empresas_codigo_unique" UNIQUE("codigo"),
	CONSTRAINT "empresas_cuit_unique" UNIQUE("cuit")
);
--> statement-breakpoint
CREATE TABLE "equipos" (
	"id" serial PRIMARY KEY NOT NULL,
	"interno" text NOT NULL,
	"nro_viejo" text,
	"tipo" text NOT NULL,
	"tns" numeric,
	"marca" text,
	"modelo" text,
	"patente" text,
	"equipo_asignado" text,
	"activo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "equipos_interno_unique" UNIQUE("interno")
);
--> statement-breakpoint
CREATE TABLE "guardias" (
	"id" serial PRIMARY KEY NOT NULL,
	"fecha" date NOT NULL,
	"rol" text NOT NULL,
	"personal_id" integer NOT NULL,
	CONSTRAINT "guardias_fecha_rol_personal_unq" UNIQUE("fecha","rol","personal_id")
);
--> statement-breakpoint
CREATE TABLE "lugares" (
	"id" serial PRIMARY KEY NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	CONSTRAINT "lugares_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "personal" (
	"id" serial PRIMARY KEY NOT NULL,
	"apellido_nombre" text NOT NULL,
	"legajo" text,
	"documento" text,
	"empresa_id" integer,
	"puesto" text,
	"telefono_wsp" text,
	"es_chofer" boolean DEFAULT false NOT NULL,
	"es_verificador" boolean DEFAULT false NOT NULL,
	"es_operador" boolean DEFAULT false NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "personal_documento_unique" UNIQUE("documento")
);
--> statement-breakpoint
CREATE TABLE "salida_envios" (
	"id" serial PRIMARY KEY NOT NULL,
	"salida_id" integer NOT NULL,
	"personal_id" integer,
	"telefono" text NOT NULL,
	"plantilla" text NOT NULL,
	"wamid" text,
	"estado" text NOT NULL,
	"error_detalle" text,
	"enviado_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "salida_personal" (
	"salida_id" integer NOT NULL,
	"personal_id" integer NOT NULL,
	"rol" "rol_salida" NOT NULL,
	"es_suplente" boolean DEFAULT false NOT NULL,
	CONSTRAINT "salida_personal_salida_id_personal_id_pk" PRIMARY KEY("salida_id","personal_id")
);
--> statement-breakpoint
CREATE TABLE "salidas" (
	"id" serial PRIMARY KEY NOT NULL,
	"numero" text NOT NULL,
	"fecha" date NOT NULL,
	"orden_dia" smallint NOT NULL,
	"equipo_id" integer NOT NULL,
	"equipo_aux_id" integer,
	"empresa_id" integer NOT NULL,
	"cliente_id" integer,
	"ot" text,
	"remito" text,
	"hora_salida" time,
	"lugar_carga" text,
	"contacto_carga" text,
	"telefono_carga" text,
	"lugar_descarga" text,
	"contacto_descarga" text,
	"telefono_descarga" text,
	"verificador_id" integer,
	"operador_id" integer,
	"gestion" "gestion_salida",
	"estado" "estado_salida" DEFAULT 'a_confirmar' NOT NULL,
	"observaciones" text,
	"creado_por" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "salidas_numero_unique" UNIQUE("numero"),
	CONSTRAINT "salidas_fecha_equipo_orden_unq" UNIQUE("fecha","equipo_id","orden_dia"),
	CONSTRAINT "salidas_orden_dia_check" CHECK ("salidas"."orden_dia" BETWEEN 1 AND 4)
);
--> statement-breakpoint
CREATE TABLE "uso_livianos" (
	"id" serial PRIMARY KEY NOT NULL,
	"fecha" date NOT NULL,
	"equipo_id" integer NOT NULL,
	"personal_id" integer,
	"lugar_salida" text,
	"hora_salida" time,
	"lugar_llegada" text,
	"hora_llegada" time,
	"uso" text,
	"observaciones" text,
	"estado" "estado_liviano" DEFAULT 'en_base' NOT NULL,
	"registrado_por" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" serial PRIMARY KEY NOT NULL,
	"personal_id" integer,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"rol" "rol_usuario" DEFAULT 'consulta' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_adjuntos" ADD CONSTRAINT "checklist_adjuntos_checklist_id_checklists_id_fk" FOREIGN KEY ("checklist_id") REFERENCES "public"."checklists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_checklist_id_checklists_id_fk" FOREIGN KEY ("checklist_id") REFERENCES "public"."checklists"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklists" ADD CONSTRAINT "checklists_equipo_id_equipos_id_fk" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklists" ADD CONSTRAINT "checklists_personal_id_personal_id_fk" FOREIGN KEY ("personal_id") REFERENCES "public"."personal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "checklists" ADD CONSTRAINT "checklists_revisado_por_usuarios_id_fk" FOREIGN KEY ("revisado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "guardias" ADD CONSTRAINT "guardias_personal_id_personal_id_fk" FOREIGN KEY ("personal_id") REFERENCES "public"."personal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "personal" ADD CONSTRAINT "personal_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salida_envios" ADD CONSTRAINT "salida_envios_salida_id_salidas_id_fk" FOREIGN KEY ("salida_id") REFERENCES "public"."salidas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salida_envios" ADD CONSTRAINT "salida_envios_personal_id_personal_id_fk" FOREIGN KEY ("personal_id") REFERENCES "public"."personal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salida_personal" ADD CONSTRAINT "salida_personal_salida_id_salidas_id_fk" FOREIGN KEY ("salida_id") REFERENCES "public"."salidas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salida_personal" ADD CONSTRAINT "salida_personal_personal_id_personal_id_fk" FOREIGN KEY ("personal_id") REFERENCES "public"."personal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salidas" ADD CONSTRAINT "salidas_equipo_id_equipos_id_fk" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salidas" ADD CONSTRAINT "salidas_equipo_aux_id_equipos_id_fk" FOREIGN KEY ("equipo_aux_id") REFERENCES "public"."equipos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salidas" ADD CONSTRAINT "salidas_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salidas" ADD CONSTRAINT "salidas_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salidas" ADD CONSTRAINT "salidas_verificador_id_personal_id_fk" FOREIGN KEY ("verificador_id") REFERENCES "public"."personal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salidas" ADD CONSTRAINT "salidas_operador_id_personal_id_fk" FOREIGN KEY ("operador_id") REFERENCES "public"."personal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "salidas" ADD CONSTRAINT "salidas_creado_por_usuarios_id_fk" FOREIGN KEY ("creado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uso_livianos" ADD CONSTRAINT "uso_livianos_equipo_id_equipos_id_fk" FOREIGN KEY ("equipo_id") REFERENCES "public"."equipos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uso_livianos" ADD CONSTRAINT "uso_livianos_personal_id_personal_id_fk" FOREIGN KEY ("personal_id") REFERENCES "public"."personal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "uso_livianos" ADD CONSTRAINT "uso_livianos_registrado_por_usuarios_id_fk" FOREIGN KEY ("registrado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_personal_id_personal_id_fk" FOREIGN KEY ("personal_id") REFERENCES "public"."personal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "auditoria_entidad_idx" ON "auditoria" USING btree ("entidad","entidad_id");--> statement-breakpoint
CREATE INDEX "equipos_tipo_idx" ON "equipos" USING btree ("tipo","activo");--> statement-breakpoint
CREATE INDEX "personal_activo_nombre_idx" ON "personal" USING btree ("activo","apellido_nombre");--> statement-breakpoint
CREATE INDEX "salida_envios_wamid_idx" ON "salida_envios" USING btree ("wamid");--> statement-breakpoint
CREATE INDEX "salidas_fecha_hora_idx" ON "salidas" USING btree ("fecha","hora_salida");--> statement-breakpoint
CREATE INDEX "salidas_estado_idx" ON "salidas" USING btree ("estado");--> statement-breakpoint
CREATE INDEX "uso_livianos_fecha_equipo_idx" ON "uso_livianos" USING btree ("fecha","equipo_id");