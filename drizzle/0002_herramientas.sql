CREATE TYPE "public"."estado_herramienta" AS ENUM('activa', 'en_reparacion', 'perdida', 'baja');--> statement-breakpoint
CREATE TYPE "public"."tipo_entrega" AS ENUM('entrega', 'devolucion', 'traslado', 'baja');--> statement-breakpoint
CREATE TABLE "herramienta_entregas" (
	"id" serial PRIMARY KEY NOT NULL,
	"tipo" "tipo_entrega" NOT NULL,
	"hacia_personal_id" integer,
	"hacia_equipo_id" integer,
	"hacia_lugar_id" integer,
	"salida_id" integer,
	"entregado_por" integer,
	"observaciones" text,
	"token_hash" text,
	"token_vence" timestamp with time zone,
	"confirmado_at" timestamp with time zone,
	"confirmado_nota" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "herramienta_entregas_un_destino_check" CHECK (num_nonnulls("herramienta_entregas"."hacia_personal_id", "herramienta_entregas"."hacia_equipo_id", "herramienta_entregas"."hacia_lugar_id") = 1)
);
--> statement-breakpoint
CREATE TABLE "herramienta_movimientos" (
	"id" serial PRIMARY KEY NOT NULL,
	"entrega_id" integer NOT NULL,
	"herramienta_id" integer NOT NULL,
	"desde_personal_id" integer,
	"desde_equipo_id" integer,
	"desde_lugar_id" integer,
	CONSTRAINT "herramienta_movimientos_entrega_herramienta_unq" UNIQUE("entrega_id","herramienta_id")
);
--> statement-breakpoint
CREATE TABLE "herramientas" (
	"id" serial PRIMARY KEY NOT NULL,
	"codigo" text NOT NULL,
	"nombre" text NOT NULL,
	"tipo" text,
	"marca" text,
	"modelo" text,
	"numero_serie" text,
	"empresa_id" integer,
	"estado" "estado_herramienta" DEFAULT 'activa' NOT NULL,
	"custodia_personal_id" integer,
	"custodia_equipo_id" integer,
	"custodia_lugar_id" integer,
	"custodia_desde" timestamp with time zone DEFAULT now() NOT NULL,
	"custodia_entrega_id" integer,
	"observaciones" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "herramientas_codigo_unique" UNIQUE("codigo"),
	CONSTRAINT "herramientas_una_custodia_check" CHECK (num_nonnulls("herramientas"."custodia_personal_id", "herramientas"."custodia_equipo_id", "herramientas"."custodia_lugar_id") = 1)
);
--> statement-breakpoint
ALTER TABLE "herramienta_entregas" ADD CONSTRAINT "herramienta_entregas_hacia_personal_id_personal_id_fk" FOREIGN KEY ("hacia_personal_id") REFERENCES "public"."personal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "herramienta_entregas" ADD CONSTRAINT "herramienta_entregas_hacia_equipo_id_equipos_id_fk" FOREIGN KEY ("hacia_equipo_id") REFERENCES "public"."equipos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "herramienta_entregas" ADD CONSTRAINT "herramienta_entregas_hacia_lugar_id_lugares_id_fk" FOREIGN KEY ("hacia_lugar_id") REFERENCES "public"."lugares"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "herramienta_entregas" ADD CONSTRAINT "herramienta_entregas_salida_id_salidas_id_fk" FOREIGN KEY ("salida_id") REFERENCES "public"."salidas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "herramienta_entregas" ADD CONSTRAINT "herramienta_entregas_entregado_por_usuarios_id_fk" FOREIGN KEY ("entregado_por") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "herramienta_movimientos" ADD CONSTRAINT "herramienta_movimientos_entrega_id_herramienta_entregas_id_fk" FOREIGN KEY ("entrega_id") REFERENCES "public"."herramienta_entregas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "herramienta_movimientos" ADD CONSTRAINT "herramienta_movimientos_herramienta_id_herramientas_id_fk" FOREIGN KEY ("herramienta_id") REFERENCES "public"."herramientas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "herramienta_movimientos" ADD CONSTRAINT "herramienta_movimientos_desde_personal_id_personal_id_fk" FOREIGN KEY ("desde_personal_id") REFERENCES "public"."personal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "herramienta_movimientos" ADD CONSTRAINT "herramienta_movimientos_desde_equipo_id_equipos_id_fk" FOREIGN KEY ("desde_equipo_id") REFERENCES "public"."equipos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "herramienta_movimientos" ADD CONSTRAINT "herramienta_movimientos_desde_lugar_id_lugares_id_fk" FOREIGN KEY ("desde_lugar_id") REFERENCES "public"."lugares"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "herramientas" ADD CONSTRAINT "herramientas_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "herramientas" ADD CONSTRAINT "herramientas_custodia_personal_id_personal_id_fk" FOREIGN KEY ("custodia_personal_id") REFERENCES "public"."personal"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "herramientas" ADD CONSTRAINT "herramientas_custodia_equipo_id_equipos_id_fk" FOREIGN KEY ("custodia_equipo_id") REFERENCES "public"."equipos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "herramientas" ADD CONSTRAINT "herramientas_custodia_lugar_id_lugares_id_fk" FOREIGN KEY ("custodia_lugar_id") REFERENCES "public"."lugares"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "herramientas" ADD CONSTRAINT "herramientas_custodia_entrega_id_herramienta_entregas_id_fk" FOREIGN KEY ("custodia_entrega_id") REFERENCES "public"."herramienta_entregas"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "herramienta_entregas_fecha_idx" ON "herramienta_entregas" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "herramienta_entregas_salida_idx" ON "herramienta_entregas" USING btree ("salida_id");--> statement-breakpoint
CREATE INDEX "herramienta_movimientos_herramienta_idx" ON "herramienta_movimientos" USING btree ("herramienta_id");--> statement-breakpoint
CREATE INDEX "herramientas_custodia_personal_idx" ON "herramientas" USING btree ("custodia_personal_id");--> statement-breakpoint
CREATE INDEX "herramientas_custodia_equipo_idx" ON "herramientas" USING btree ("custodia_equipo_id");--> statement-breakpoint
CREATE INDEX "herramientas_estado_idx" ON "herramientas" USING btree ("estado");