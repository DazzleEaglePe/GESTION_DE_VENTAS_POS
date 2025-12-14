-- =====================================================
-- FIX: Corregir trigger de auditoría
-- Problema: El trigger falla en tablas sin campo eliminado_por
-- Fecha: Diciembre 2025
-- =====================================================

-- Recrear la función del trigger con acceso seguro a campos
CREATE OR REPLACE FUNCTION trigger_auditoria()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_operacion VARCHAR(10);
    v_datos_anteriores JSONB := NULL;
    v_datos_nuevos JSONB := NULL;
    v_registro_id BIGINT;
    v_id_usuario BIGINT := NULL;
    v_id_empresa BIGINT := NULL;
    v_accion_detalle TEXT := '';
    v_new_json JSONB;
    v_old_json JSONB;
BEGIN
    -- Determinar la operación
    IF TG_OP = 'INSERT' THEN
        v_operacion := 'INSERT';
        v_datos_nuevos := to_jsonb(NEW);
        v_new_json := v_datos_nuevos;
        v_registro_id := NEW.id;
        v_accion_detalle := 'Nuevo registro creado en ' || TG_TABLE_NAME;
        
        -- Intentar obtener id_empresa de forma segura
        IF v_new_json ? 'id_empresa' THEN
            v_id_empresa := (v_new_json->>'id_empresa')::BIGINT;
        END IF;
        
    ELSIF TG_OP = 'UPDATE' THEN
        v_operacion := 'UPDATE';
        v_datos_anteriores := to_jsonb(OLD);
        v_datos_nuevos := to_jsonb(NEW);
        v_old_json := v_datos_anteriores;
        v_new_json := v_datos_nuevos;
        v_registro_id := NEW.id;
        
        -- Detectar soft delete (cambio de activo de true a false)
        IF v_old_json ? 'activo' AND v_new_json ? 'activo' THEN
            IF (v_old_json->>'activo')::BOOLEAN = true AND (v_new_json->>'activo')::BOOLEAN = false THEN
                v_accion_detalle := 'Registro eliminado (soft delete) en ' || TG_TABLE_NAME;
            ELSIF (v_old_json->>'activo')::BOOLEAN = false AND (v_new_json->>'activo')::BOOLEAN = true THEN
                v_accion_detalle := 'Registro restaurado en ' || TG_TABLE_NAME;
            ELSE
                v_accion_detalle := 'Registro actualizado en ' || TG_TABLE_NAME;
            END IF;
        ELSE
            v_accion_detalle := 'Registro actualizado en ' || TG_TABLE_NAME;
        END IF;
        
        -- Intentar obtener id_empresa de forma segura
        IF v_new_json ? 'id_empresa' THEN
            v_id_empresa := (v_new_json->>'id_empresa')::BIGINT;
        END IF;
        
    ELSIF TG_OP = 'DELETE' THEN
        v_operacion := 'DELETE';
        v_datos_anteriores := to_jsonb(OLD);
        v_old_json := v_datos_anteriores;
        v_registro_id := OLD.id;
        v_accion_detalle := 'Registro eliminado permanentemente de ' || TG_TABLE_NAME;
        
        -- Intentar obtener id_empresa de forma segura
        IF v_old_json ? 'id_empresa' THEN
            v_id_empresa := (v_old_json->>'id_empresa')::BIGINT;
        END IF;
    END IF;
    
    -- Intentar obtener id_usuario del registro de forma SEGURA usando JSONB
    -- Esto evita el error "record has no field"
    IF TG_OP IN ('INSERT', 'UPDATE') THEN
        -- Primero verificar si existe el campo eliminado_por
        IF v_new_json ? 'eliminado_por' AND v_new_json->>'eliminado_por' IS NOT NULL THEN
            v_id_usuario := (v_new_json->>'eliminado_por')::BIGINT;
        -- Si no, intentar con id_usuario
        ELSIF v_new_json ? 'id_usuario' AND v_new_json->>'id_usuario' IS NOT NULL THEN
            v_id_usuario := (v_new_json->>'id_usuario')::BIGINT;
        -- Si no, intentar con id_usuario_creador
        ELSIF v_new_json ? 'id_usuario_creador' AND v_new_json->>'id_usuario_creador' IS NOT NULL THEN
            v_id_usuario := (v_new_json->>'id_usuario_creador')::BIGINT;
        END IF;
    END IF;
    
    -- Insertar registro de auditoría
    INSERT INTO auditoria (
        tabla,
        operacion,
        registro_id,
        datos_anteriores,
        datos_nuevos,
        id_usuario,
        id_empresa,
        accion_detalle
    ) VALUES (
        TG_TABLE_NAME,
        v_operacion,
        v_registro_id,
        v_datos_anteriores,
        v_datos_nuevos,
        v_id_usuario,
        v_id_empresa,
        v_accion_detalle
    );
    
    -- Retornar el registro apropiado
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$;

-- =====================================================
-- Verificar que los triggers en movimientos_stock existen correctamente
-- =====================================================

-- Eliminar trigger de auditoría en movimientos_stock si existe
-- (esta tabla tiene muchas inserciones y podría no necesitar auditoría completa)
DROP TRIGGER IF EXISTS audit_movimientos_stock ON movimientos_stock;

-- NOTA: Si deseas auditoría en movimientos_stock, descomenta lo siguiente:
-- CREATE TRIGGER audit_movimientos_stock
--     AFTER INSERT OR UPDATE OR DELETE ON movimientos_stock
--     FOR EACH ROW EXECUTE FUNCTION trigger_auditoria();

-- =====================================================
-- COMENTARIO
-- =====================================================
COMMENT ON FUNCTION trigger_auditoria IS 
'Trigger de auditoría corregido - accede a campos de forma segura usando JSONB para evitar errores en tablas que no tienen todos los campos esperados';
