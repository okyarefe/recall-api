import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserFkToEntries1789912229339 implements MigrationInterface {
  name = 'AddUserFkToEntries1789912229339';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Postgres validates every existing row before creating a foreign key

    await queryRunner.query(
      `DELETE FROM "entries" e WHERE NOT EXISTS (SELECT 1 FROM "user" u WHERE u.id = e."userId")`,
    );

    await queryRunner.query(
      `ALTER TABLE "entries" ADD CONSTRAINT "FK_e186b0c87ddac0718d1f6783f98" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "entries" DROP CONSTRAINT "FK_e186b0c87ddac0718d1f6783f98"`,
    );
  }
}
