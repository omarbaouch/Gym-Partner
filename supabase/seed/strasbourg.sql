with data(name,address,city,postal_code,lat,lng,brand) as (values
('Basic-Fit','10 Rue Alexandre Dumas','Strasbourg','',48.5896493,7.6998052,'Basic-Fit'),
('Basic-Fit','8 Rue Alexandre Dumas','Strasbourg','',48.5899561,7.7002691,'Basic-Fit'),
('Centre sportif du bon pasteur','','Strasbourg','',48.5882445,7.7784899,''),
('Basic-Fit','','Strasbourg','',48.5822838,7.7366265,'Basic-Fit'),
('KeepCool','','Strasbourg','',48.5840269,7.7429264,''),
('SportLib''','','Strasbourg','',48.5869315,7.7433797,''),
('KeepCool','','Strasbourg','',48.5714794,7.7543327,''),
('CrossFit Strasbourg','48 Chemin Haut','Strasbourg','67200',48.5951374,7.7304019,''),
('Keep Cool Neudorf Ribauvillé','59 Rue de Ribeauvillé','Strasbourg','67100',48.5665202,7.7727379,''),
('Gymnase Adler','','Strasbourg','',48.6014848,7.7849736,''),
('One Fitness Club','','Strasbourg','',48.5611052,7.742915,''),
('One','','Strasbourg','',48.5842434,7.7385086,''),
('Body Hit','','Strasbourg','',48.5848705,7.7380694,''),
('Nero Crossfit','','Strasbourg','',48.5610622,7.7447136,''),
('Basic-Fit','','Strasbourg','',48.5526107,7.7435221,'Basic-Fit'),
('Accrosport Strasbourg','','Strasbourg','',48.5872794,7.6890416,''),
('FitBar Strasbourg','6 Rue de Sarajevo','Strasbourg','67100',48.5703175,7.7794039,''),
('Panza Gym','','Strasbourg','',48.5643161,7.7521614,''),
('Ninja storm','','Strasbourg','',48.5896979,7.699415,''),
('GymFit','','Strasbourg','',48.5785377,7.7706324,''),
('O''Zone Hiit studios','27 Boulevard de Nancy','Strasbourg','67000',48.5811953,7.7316884,''),
('Yogamoves','','Strasbourg','',48.5654209,7.7581486,''),
('Centre de Yoga Iyengar de Strasbourg','','Strasbourg','',48.5866043,7.7450847,''),
('Feel Sport','','Strasbourg','',48.5830565,7.7534545,''),
('Basic-Fit','','Strasbourg','',48.5905848,7.7413195,'Basic-Fit'),
('Le Cercle Fitness','','Strasbourg','',48.549758,7.747425,''),
('Evae','','Strasbourg','',48.5708575,7.7786548,'')
)
insert into public.gyms (chain_id,name,address,city,postal_code,country,latitude,longitude)
select c.id,d.name,nullif(d.address,''),d.city,nullif(d.postal_code,''),'FR',d.lat,d.lng
from data d left join public.gym_chains c on c.name = nullif(d.brand,'');