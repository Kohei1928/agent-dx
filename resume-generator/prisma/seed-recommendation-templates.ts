import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const initialTemplates = [
  {
    name: "エンジニア職",
    points: "",
    exampleText: "",
  },
  {
    name: "携帯販売職",
    points: "",
    exampleText: "",
  },
  {
    name: "事務職",
    points: "",
    exampleText: "",
  },
];

async function main() {
  console.log("Seeding recommendation templates...");

  for (const template of initialTemplates) {
    const existing = await prisma.recommendationTemplate.findFirst({
      where: { name: template.name },
    });

    if (!existing) {
      await prisma.recommendationTemplate.create({
        data: template,
      });
      console.log(`Created template: ${template.name}`);
    } else {
      console.log(`Template already exists: ${template.name}`);
    }
  }

  console.log("Seeding completed!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });









