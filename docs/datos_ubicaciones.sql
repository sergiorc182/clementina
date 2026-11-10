-- Países, provincias y localidades de prueba para el formulario de "Mis datos".
-- Se puede importar después de docs/esquema_normalizado.sql, tanto en una base
-- nueva como en una existente: los INSERT actualizan los nombres si ya existen.
-- Corrige además los acentos que quedaron como "?" en importaciones viejas.

INSERT INTO paises (id_pais, iso3, nombre, nacionalidad, orden) VALUES
  ('AR', 'ARG', 'Argentina', 'Argentina', 1),
  ('BO', 'BOL', 'Bolivia', 'Boliviana', 2),
  ('BR', 'BRA', 'Brasil', 'Brasileña', 3),
  ('CL', 'CHL', 'Chile', 'Chilena', 4),
  ('CO', 'COL', 'Colombia', 'Colombiana', 5),
  ('EC', 'ECU', 'Ecuador', 'Ecuatoriana', 6),
  ('ES', 'ESP', 'España', 'Española', 7),
  ('IT', 'ITA', 'Italia', 'Italiana', 8),
  ('PY', 'PRY', 'Paraguay', 'Paraguaya', 9),
  ('PE', 'PER', 'Perú', 'Peruana', 10),
  ('UY', 'URY', 'Uruguay', 'Uruguaya', 11),
  ('VE', 'VEN', 'Venezuela', 'Venezolana', 12),
  ('US', 'USA', 'Estados Unidos', 'Estadounidense', 13),
  ('ZZ', 'ZZZ', 'No especificado', 'No especificada', 1000)
ON DUPLICATE KEY UPDATE
  iso3 = VALUES(iso3),
  nombre = VALUES(nombre),
  nacionalidad = VALUES(nacionalidad),
  orden = VALUES(orden);

INSERT INTO provincias (id_provincia, nombre) VALUES
  (1, 'Buenos Aires'),
  (2, 'Ciudad Autónoma de Buenos Aires'),
  (3, 'Catamarca'),
  (4, 'Chaco'),
  (5, 'Chubut'),
  (6, 'Córdoba'),
  (7, 'Corrientes'),
  (8, 'Entre Ríos'),
  (9, 'Formosa'),
  (10, 'Jujuy'),
  (11, 'La Pampa'),
  (12, 'La Rioja'),
  (13, 'Mendoza'),
  (14, 'Misiones'),
  (15, 'Neuquén'),
  (16, 'Río Negro'),
  (17, 'Salta'),
  (18, 'San Juan'),
  (19, 'San Luis'),
  (20, 'Santa Cruz'),
  (21, 'Santa Fe'),
  (22, 'Santiago del Estero'),
  (23, 'Tierra del Fuego'),
  (24, 'Tucumán')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

INSERT INTO localidades (id_localidad, id_provincia, id_partido, nombre) VALUES
  (1, 1, NULL, 'San Miguel'),
  (2, 1, NULL, 'Bella Vista'),
  (3, 1, NULL, 'Muñiz'),
  (4, 1, NULL, 'José C. Paz'),
  (5, 1, NULL, 'Los Polvorines'),
  (6, 1, NULL, 'Grand Bourg'),
  (7, 1, NULL, 'Moreno'),
  (8, 1, NULL, 'Paso del Rey'),
  (9, 1, NULL, 'Hurlingham'),
  (10, 1, NULL, 'Villa Tesei'),
  (11, 1, NULL, 'Morón'),
  (12, 1, NULL, 'Castelar'),
  (13, 1, NULL, 'Ituzaingó'),
  (14, 1, NULL, 'San Martín'),
  (15, 1, NULL, 'Caseros'),
  (16, 1, NULL, 'Tigre'),
  (17, 1, NULL, 'Don Torcuato'),
  (18, 1, NULL, 'San Isidro'),
  (19, 1, NULL, 'Vicente López'),
  (20, 1, NULL, 'Pilar'),
  (21, 1, NULL, 'La Plata'),
  (22, 1, NULL, 'Mar del Plata'),
  (23, 1, NULL, 'Bahía Blanca'),
  (24, 1, NULL, 'Quilmes'),
  (25, 1, NULL, 'Lomas de Zamora'),
  (26, 2, NULL, 'CABA - Capital Federal'),
  (27, 6, NULL, 'Córdoba Capital'),
  (28, 6, NULL, 'Villa Carlos Paz'),
  (29, 21, NULL, 'Rosario'),
  (30, 21, NULL, 'Santa Fe Capital'),
  (31, 13, NULL, 'Mendoza Capital'),
  (32, 24, NULL, 'San Miguel de Tucumán'),
  (33, 17, NULL, 'Salta Capital'),
  (34, 7, NULL, 'Corrientes Capital'),
  (35, 8, NULL, 'Paraná'),
  (36, 14, NULL, 'Posadas')
ON DUPLICATE KEY UPDATE
  id_provincia = VALUES(id_provincia),
  id_partido = VALUES(id_partido),
  nombre = VALUES(nombre);
