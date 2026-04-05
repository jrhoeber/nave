-- Parish seed data
-- Diocese of Buffalo, NY
-- Run: psql $DATABASE_URL -f seeds/parishes.sql

INSERT INTO parishes (name, street_address, city, state, postal_code, diocese, established)
VALUES
  ('St. Joseph Cathedral',                    '50 Franklin St.',      'Buffalo',      'NY', '14202', 'Diocese of Buffalo', 1847),
  ('St. Louis Roman Catholic Church',         '780 Main St.',         'Buffalo',      'NY', '14202', 'Diocese of Buffalo', 1829),
  ('Our Lady of Victory Basilica',            '767 Ridge Rd.',        'Lackawanna',   'NY', '14218', 'Diocese of Buffalo', 1921),
  ('St. Anthony of Padua',                    '160 Court St.',        'Buffalo',      'NY', '14202', 'Diocese of Buffalo', 1891),
  ('St. Stanislaus Bishop & Martyr',          '123 Townsend St.',     'Buffalo',      'NY', '14212', 'Diocese of Buffalo', 1873),
  ('Assumption',                              '435 Amherst St.',      'Buffalo',      'NY', '14207', 'Diocese of Buffalo', 1888),
  ('Blessed Sacrament',                       '1025 Delaware Ave.',   'Buffalo',      'NY', '14209', 'Diocese of Buffalo', 1887),
  ('Blessed Trinity',                         '317 Leroy Ave.',       'Buffalo',      'NY', '14214', 'Diocese of Buffalo', 1906),
  ('Coronation of the Blessed Virgin Mary',   '374 Dewitt St.',       'Buffalo',      'NY', '14213', 'Diocese of Buffalo', 1950),
  ('Corpus Christi',                          '199 Clark St.',        'Buffalo',      'NY', '14212', 'Diocese of Buffalo', 1898),
  ('Holy Cross',                              '140 7th St.',          'Buffalo',      'NY', '14201', 'Diocese of Buffalo', 1914),
  ('Holy Spirit',                             '85 Dakota St.',        'Buffalo',      'NY', '14216', 'Diocese of Buffalo', 1910),
  ('Our Lady of Charity',                     '1901 S. Park Ave.',    'Buffalo',      'NY', '14220', 'Diocese of Buffalo', 2010),
  ('Our Lady of Hope',                        '18 Greenwood Pl.',     'Buffalo',      'NY', '14213', 'Diocese of Buffalo', 2009),
  ('St. Rose of Lima',                        '500 Parker Ave.',      'Buffalo',      'NY', '14216', 'Diocese of Buffalo', 1925),
  ('St. Casimir',                             '160 Cable St.',        'Buffalo',      'NY', '14206', 'Diocese of Buffalo', 1890),
  ('St. Gregory the Great',                   '200 St. Gregory Court','Williamsville','NY', '14221', 'Diocese of Buffalo', 1958)
ON CONFLICT DO NOTHING;
