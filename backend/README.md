# Nyílt nap API

A backend Node.js, Express, Drizzle ORM és MySQL használatával készült.

## Indítás

1. A projekt gyökerében másold a `.env.example` fájlt `.env` néven.
2. Állíts be egy legalább 32 karakteres, véletlenszerű `AUTH_SECRET` értéket, valamint saját adatbázis- és adminisztrátori adatokat.
3. Indítsd el a MySQL-adatbázist, majd a projekt gyökeréből telepítsd a függőségeket: `npm install`.
4. A backend könyvtárából hozd létre vagy frissítsd az adatbázissémát: `npm run db:push`.
5. Hozd létre az adminfiókot: `npm run admin:create`.
6. Indítsd el az API-t: `npm run dev` (vagy a projekt gyökeréből: `npm run dev:backend`).

Az API alapértelmezett címe `http://localhost:3000`. Az adminfiók létrehozó parancs a `.env`-ben megadott e-mailhez adminjogot és jelszót állít be; ezeket az adatokat ne töltsd fel a verziókezelőbe.

## Végpontok

Az `Authorization: Bearer <token>` fejlécet igénylő végpontok csak sikeres bejelentkezés után használhatók. A nyilvános regisztráció mindig látogatói fiókot hoz létre.

| Metódus | Útvonal | Jogosultság | Leírás |
| --- | --- | --- | --- |
| `GET` | `/api/health` | nyilvános | API állapot |
| `POST` | `/api/auth/register` | nyilvános | Látogatói regisztráció (`name`, `email`, `password`) |
| `POST` | `/api/auth/login` | nyilvános | Bejelentkezés; hozzáférési tokent ad vissza |
| `GET` | `/api/auth/me` | bejelentkezett | Aktuális fiók lekérdezése |
| `GET` | `/api/lessons` | bejelentkezett | Meghirdetett órák és szabad helyek |
| `POST` | `/api/lessons` | admin | Óra létrehozása (`subject`, `teacher`, `room`, `startsAt`, `endsAt`, `capacity`) |
| `DELETE` | `/api/lessons/:id` | admin | Óra és jelentkezéseinek törlése |
| `GET` | `/api/registrations/mine` | látogató | Saját órarend |
| `POST` | `/api/registrations/:lessonId` | látogató | Jelentkezés egy órára |
| `DELETE` | `/api/registrations/:lessonId` | látogató | Jelentkezés visszamondása |

Az óraidőpontok ISO 8601 formátumú dátumok legyenek. A teremütközés ellenőrzése átfedő időintervallumokat keres, a kapacitásellenőrzés tranzakcióban, az óra zárolásával történik. A hibák JSON-válasza `{ "error": "..." }`; a kliensnek a HTTP-státuszkódot is ellenőriznie kell.

## Adatbázis-migráció

Fejlesztéshez használható a `npm run db:push`. Verziózott SQL-migráció létrehozásához és futtatásához:

```sh
npm run db:generate
npm run db:migrate
```

Az alapértelmezett `users` táblában korábban tárolt felhasználók jelszóhash nélkül maradnak; belépésük nem lehetséges, amíg az adminfiók-létrehozó parancs nem állít be hozzájuk jelszót.

## Tesztek

A backend beépített Node.js tesztfuttatója:

```sh
npm test
```
