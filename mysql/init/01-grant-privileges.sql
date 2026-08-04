-- Grants yalahaji_user broader privileges so Prisma Migrate can create
-- and drop its temporary "shadow" database during `prisma migrate dev`.
-- Runs automatically on first container init (docker-entrypoint-initdb.d).
GRANT ALL PRIVILEGES ON *.* TO 'yalahaji_user'@'%' WITH GRANT OPTION;
FLUSH PRIVILEGES;
