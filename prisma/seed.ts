import { PrismaClient, AssetType, UserRole } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // Create sample admin user
  // IMPORTANT: Change this email to your actual admin email domain
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@yourcompany.com' },
    update: {},
    create: {
      email: 'admin@yourcompany.com',
      name: 'Admin User',
      role: UserRole.ADMIN,
    },
  })
  console.log('Created admin user:', adminUser.email)

  // Create sample partner user
  const partnerUser = await prisma.user.upsert({
    where: { email: 'partner@example.com' },
    update: {},
    create: {
      email: 'partner@example.com',
      name: 'Partner User',
      role: UserRole.PARTNER,
    },
  })
  console.log('Created partner user:', partnerUser.email)

  // Create sample sales decks
  const deck1 = await prisma.asset.create({
    data: {
      type: AssetType.DECK,
      title: 'Platform Overview 2024',
      description: 'Comprehensive overview of the platform features and capabilities.',
      region: ['EMEA', 'Americas', 'APAC'],
      language: ['en'],
      persona: ['Sales', 'Executive'],
      publishedAt: new Date(),
    },
  })

  const deck2 = await prisma.asset.create({
    data: {
      type: AssetType.DECK,
      title: 'Enterprise Integration Guide',
      description: 'Technical integration guide for enterprise customers.',
      region: ['Global'],
      language: ['en', 'de'],
      persona: ['Technical', 'Sales'],
      publishedAt: new Date(),
    },
  })

  console.log('Created sample decks:', deck1.title, deck2.title)

  // Create sample campaigns
  const campaign1 = await prisma.asset.create({
    data: {
      type: AssetType.CAMPAIGN,
      title: 'Q1 2024 Partner Campaign',
      description: 'Email templates and assets for the Q1 partner campaign.',
      campaignGoal: 'Increase partner engagement and pipeline',
      region: ['EMEA'],
      language: ['en', 'nl', 'de'],
      persona: ['Marketing'],
      publishedAt: new Date(),
    },
  })

  console.log('Created sample campaign:', campaign1.title)

  // Create sample assets
  const asset1 = await prisma.asset.create({
    data: {
      type: AssetType.ASSET,
      title: 'Logo Pack',
      description: 'Official logos in various formats (PNG, SVG, EPS).',
      externalLink: 'https://example.com/brand/logos',
      region: ['Global'],
      language: ['en'],
      persona: ['Marketing'],
      publishedAt: new Date(),
    },
  })

  console.log('Created sample asset:', asset1.title)

  // Create sample docs updates
  const docsUpdate1 = await prisma.docsUpdate.create({
    data: {
      title: 'API v3.0 Documentation Released',
      summary: 'Complete overhaul of the API documentation with new examples and guides.',
      deepLink: 'https://docs.example.com/api/v3',
      category: 'API',
      publishedAt: new Date(),
    },
  })

  const docsUpdate2 = await prisma.docsUpdate.create({
    data: {
      title: 'New Integration Tutorials',
      summary: 'Step-by-step tutorials for common integration scenarios.',
      deepLink: 'https://docs.example.com/tutorials',
      category: 'Integration',
      publishedAt: new Date(),
    },
  })

  console.log('Created sample docs updates:', docsUpdate1.title, docsUpdate2.title)

  // Create sample product updates
  const productUpdate1 = await prisma.productUpdate.create({
    data: {
      title: 'Enhanced Analytics Dashboard',
      content: 'We have completely redesigned the analytics dashboard with new metrics, customizable widgets, and improved performance.',
      updateType: 'release_note',
      releaseDate: new Date(),
      publishedAt: new Date(),
    },
  })

  const productUpdate2 = await prisma.productUpdate.create({
    data: {
      title: 'AI-Powered Recommendations',
      content: 'Coming soon: AI-powered product recommendations to help increase conversion rates.',
      updateType: 'coming_up',
      publishedAt: new Date(),
    },
  })

  console.log('Created sample product updates:', productUpdate1.title, productUpdate2.title)

  // Create sample team members
  const teamMembers = await Promise.all([
    prisma.teamMember.create({
      data: {
        name: 'John Smith',
        role: 'Partner Success Manager',
        department: 'Partner Success',
        email: 'john.smith@yourcompany.com',
        displayOrder: 1,
      },
    }),
    prisma.teamMember.create({
      data: {
        name: 'Sarah Johnson',
        role: 'Technical Solutions Engineer',
        department: 'Solutions',
        email: 'sarah.johnson@yourcompany.com',
        displayOrder: 2,
      },
    }),
    prisma.teamMember.create({
      data: {
        name: 'Michael Chen',
        role: 'Partner Marketing Manager',
        department: 'Marketing',
        email: 'michael.chen@yourcompany.com',
        displayOrder: 3,
      },
    }),
  ])

  console.log('Created sample team members:', teamMembers.map(m => m.name).join(', '))

  // Create featured content
  const featured = await prisma.featuredContent.create({
    data: {
      title: 'New Platform Overview Deck',
      description: 'Check out the updated platform overview for 2024',
      entityType: 'asset',
      assetId: deck1.id,
      displayOrder: 1,
    },
  })

  console.log('Created featured content:', featured.title)

  // Create changelog entries
  await prisma.changelog.createMany({
    data: [
      {
        action: 'created',
        entityType: 'asset',
        entityId: deck1.id,
        entityTitle: deck1.title,
        assetId: deck1.id,
      },
      {
        action: 'created',
        entityType: 'docs_update',
        entityId: docsUpdate1.id,
        entityTitle: docsUpdate1.title,
        docsUpdateId: docsUpdate1.id,
      },
      {
        action: 'created',
        entityType: 'product_update',
        entityId: productUpdate1.id,
        entityTitle: productUpdate1.title,
        productUpdateId: productUpdate1.id,
      },
    ],
  })

  console.log('Created changelog entries')

  // Initialize digest state
  await prisma.digestState.upsert({
    where: { id: 'singleton' },
    update: {},
    create: {
      id: 'singleton',
    },
  })

  console.log('Initialized digest state')

  // Add allowed domains for partner access
  // IMPORTANT: Update these domains to match your company and partner domains
  const allowedDomains = [
    {
      domain: 'yourcompany.com',
      companyName: 'Your Company (Internal)',
      notes: 'Internal admin access - always allowed',
      isActive: true,
    },
    {
      domain: 'example.com',
      companyName: 'Example Partner',
      notes: 'Test partner domain',
      isActive: true,
    },
    // Add more partner domains here as needed
  ]

  for (const domainData of allowedDomains) {
    await prisma.allowedDomain.upsert({
      where: { domain: domainData.domain },
      update: {},
      create: domainData,
    })
  }

  console.log('Added allowed domains:', allowedDomains.map(d => d.domain).join(', '))

  console.log('Seeding completed!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
