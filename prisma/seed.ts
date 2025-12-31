/**
 * Database Seed Script - Comprehensive Demo Data
 * Story 1.2: JWT Middleware & User Context
 *
 * Seeds the database with complete demo data for testing:
 *
 * AUTHORIZATION:
 * - 4 default roles (Admin, NDA User, Limited User, Read-Only)
 * - 11 permissions (7 NDA + 4 admin)
 * - Role-permission mappings as defined in the architecture
 * - Agency groups and subagencies (DoD, Federal, Commercial, Healthcare)
 *
 * USERS:
 * - 5 internal USmax users (various roles and agency access)
 * - 3 external contacts (partner companies)
 * - Complete user profiles with job titles, signatures, etc.
 *
 * NDA DATA:
 * - 5 sample NDAs across all lifecycle statuses
 * - Complete NDA status history for each
 * - 7 sample documents (generated, uploaded, fully executed)
 * - 1 email record
 * - NDA subscriptions
 *
 * TEMPLATES & CONFIG:
 * - 2 RTF templates (generic + DoD-specific)
 * - 6 system configuration entries
 *
 * Run with: pnpm exec prisma db seed
 */

// Load environment variables
import { config } from 'dotenv';
config({ path: '.env.local' });
config();

import { PrismaClient } from '../src/generated/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL must be set to run seed script');
}

const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

const prisma = new PrismaClient({ adapter });

// =============================================================================
// PERMISSION DEFINITIONS
// =============================================================================

const PERMISSIONS = [
  // NDA Permissions (7)
  { code: 'nda:create', name: 'Create NDA', description: 'Create new NDAs', category: 'nda' },
  { code: 'nda:update', name: 'Update NDA', description: 'Edit existing NDAs', category: 'nda' },
  { code: 'nda:upload_document', name: 'Upload Document', description: 'Upload documents to NDAs', category: 'nda' },
  { code: 'nda:send_email', name: 'Send Email', description: 'Send emails related to NDAs', category: 'nda' },
  { code: 'nda:mark_status', name: 'Mark Status', description: 'Change NDA status', category: 'nda' },
  { code: 'nda:view', name: 'View NDA', description: 'View NDA details', category: 'nda' },
  { code: 'nda:delete', name: 'Delete NDA', description: 'Delete NDAs', category: 'nda' },

  // Admin Permissions (4)
  { code: 'admin:manage_users', name: 'Manage Users', description: 'Create, edit, deactivate users', category: 'admin' },
  { code: 'admin:manage_agencies', name: 'Manage Agencies', description: 'Create, edit agency groups and subagencies', category: 'admin' },
  { code: 'admin:manage_templates', name: 'Manage Templates', description: 'Create, edit RTF and email templates', category: 'admin' },
  { code: 'admin:view_audit_logs', name: 'View Audit Logs', description: 'Access centralized audit log viewer', category: 'admin' },
];

// =============================================================================
// ROLE DEFINITIONS WITH PERMISSION MAPPINGS
// =============================================================================

const ROLES = [
  {
    name: 'Admin',
    description: 'Full system access - can manage users, agencies, templates, and all NDA operations',
    isSystemRole: true,
    permissions: [
      // All 11 permissions
      'nda:create', 'nda:update', 'nda:upload_document', 'nda:send_email',
      'nda:mark_status', 'nda:view', 'nda:delete',
      'admin:manage_users', 'admin:manage_agencies', 'admin:manage_templates', 'admin:view_audit_logs',
    ],
  },
  {
    name: 'NDA User',
    description: 'Can create, edit, and send NDAs within their authorized agencies',
    isSystemRole: true,
    permissions: [
      'nda:create', 'nda:update', 'nda:upload_document', 'nda:send_email',
      'nda:mark_status', 'nda:view',
    ],
  },
  {
    name: 'Limited User',
    description: 'Can view NDAs and upload documents, but cannot create or edit',
    isSystemRole: true,
    permissions: [
      'nda:upload_document', 'nda:view',
    ],
  },
  {
    name: 'Read-Only',
    description: 'Can only view NDAs - default role for new users',
    isSystemRole: true,
    permissions: [
      'nda:view',
    ],
  },
];

// =============================================================================
// SAMPLE AGENCY STRUCTURE (for development)
// =============================================================================

const AGENCY_GROUPS = [
  {
    name: 'Department of Defense',
    code: 'DoD',
    description: 'Military and defense agencies',
    subagencies: [
      { name: 'US Air Force', code: 'USAF', description: 'United States Air Force' },
      { name: 'US Army', code: 'USA', description: 'United States Army' },
      { name: 'US Navy', code: 'USN', description: 'United States Navy' },
      { name: 'US Marine Corps', code: 'USMC', description: 'United States Marine Corps' },
      { name: 'Defense Logistics Agency', code: 'DLA', description: 'Defense Logistics Agency' },
    ],
  },
  {
    name: 'Federal Civilian',
    code: 'FedCiv',
    description: 'Non-defense federal agencies',
    subagencies: [
      { name: 'Department of Homeland Security', code: 'DHS', description: 'DHS and its components' },
      { name: 'Department of Veterans Affairs', code: 'VA', description: 'Veterans Affairs' },
      { name: 'General Services Administration', code: 'GSA', description: 'GSA' },
      { name: 'NASA', code: 'NASA', description: 'National Aeronautics and Space Administration' },
    ],
  },
  {
    name: 'Commercial',
    code: 'COMM',
    description: 'Commercial and private sector clients',
    subagencies: [
      { name: 'Fortune 500', code: 'F500', description: 'Fortune 500 companies' },
      { name: 'Small Business', code: 'SMB', description: 'Small and medium businesses' },
      { name: 'Healthcare', code: 'HLTH', description: 'Healthcare industry' },
    ],
  },
  {
    name: 'Healthcare',
    code: 'HHS',
    description: 'Healthcare and human services agencies',
    subagencies: [
      { name: 'Centers for Medicare & Medicaid', code: 'CMS', description: 'CMS' },
      { name: 'National Institutes of Health', code: 'NIH', description: 'NIH' },
      { name: 'Food and Drug Administration', code: 'FDA', description: 'FDA' },
    ],
  },
];

// =============================================================================
// SEED FUNCTIONS
// =============================================================================

async function seedPermissions() {
  console.log('Seeding permissions...');

  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: {
        name: permission.name,
        description: permission.description,
        category: permission.category,
      },
      create: permission,
    });
  }

  console.log(`  Created/updated ${PERMISSIONS.length} permissions`);
}

async function seedRoles() {
  console.log('Seeding roles...');

  for (const roleData of ROLES) {
    // Create or update the role
    const role = await prisma.role.upsert({
      where: { name: roleData.name },
      update: {
        description: roleData.description,
        isSystemRole: roleData.isSystemRole,
      },
      create: {
        name: roleData.name,
        description: roleData.description,
        isSystemRole: roleData.isSystemRole,
      },
    });

    // Get permission IDs
    const permissions = await prisma.permission.findMany({
      where: { code: { in: roleData.permissions } },
    });

    // Clear existing role permissions and create new ones
    await prisma.rolePermission.deleteMany({
      where: { roleId: role.id },
    });

    await prisma.rolePermission.createMany({
      data: permissions.map((p) => ({
        roleId: role.id,
        permissionId: p.id,
      })),
    });

    console.log(`  Created/updated role: ${roleData.name} with ${permissions.length} permissions`);
  }
}

async function seedAgencyStructure() {
  console.log('Seeding agency structure...');

  for (const groupData of AGENCY_GROUPS) {
    // Create agency group
    const agencyGroup = await prisma.agencyGroup.upsert({
      where: { code: groupData.code },
      update: {
        name: groupData.name,
        description: groupData.description,
      },
      create: {
        name: groupData.name,
        code: groupData.code,
        description: groupData.description,
      },
    });

    // Create subagencies
    for (const subData of groupData.subagencies) {
      await prisma.subagency.upsert({
        where: {
          agencyGroupId_code: {
            agencyGroupId: agencyGroup.id,
            code: subData.code,
          },
        },
        update: {
          name: subData.name,
          description: subData.description,
        },
        create: {
          agencyGroupId: agencyGroup.id,
          name: subData.name,
          code: subData.code,
          description: subData.description,
        },
      });
    }

    console.log(`  Created/updated agency group: ${groupData.name} with ${groupData.subagencies.length} subagencies`);
  }
}

async function seedDevUsers() {
  // Only create dev users in development mode
  if (process.env.NODE_ENV === 'production') {
    console.log('Skipping dev users in production');
    return;
  }

  console.log('Seeding development users...');

  const adminRole = await prisma.role.findUnique({ where: { name: 'Admin' } });
  const ndaUserRole = await prisma.role.findUnique({ where: { name: 'NDA User' } });
  const limitedUserRole = await prisma.role.findUnique({ where: { name: 'Limited User' } });
  const readOnlyRole = await prisma.role.findUnique({ where: { name: 'Read-Only' } });
  const dodAgencyGroup = await prisma.agencyGroup.findUnique({ where: { code: 'DoD' } });
  const fedCivAgencyGroup = await prisma.agencyGroup.findUnique({ where: { code: 'FedCiv' } });
  const commAgencyGroup = await prisma.agencyGroup.findUnique({ where: { code: 'COMM' } });

  if (!adminRole || !ndaUserRole || !dodAgencyGroup) {
    console.warn('  Skipping dev users - required roles/agencies not found');
    return;
  }

  // Admin user (matches mock auth)
  const adminUser = await prisma.contact.upsert({
    where: { email: 'admin@usmax.com' },
    update: {},
    create: {
      cognitoId: 'mock-user-001',
      email: 'admin@usmax.com',
      firstName: 'Admin',
      lastName: 'User',
      isInternal: true,
      jobTitle: 'System Administrator',
      workPhone: '555-0100',
      emailSignature: 'Best regards,\nAdmin User\nSystem Administrator\nUSmax Corporation',
    },
  });

  // Assign Admin role
  await prisma.contactRole.upsert({
    where: {
      contactId_roleId: {
        contactId: adminUser.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      contactId: adminUser.id,
      roleId: adminRole.id,
    },
  });

  // Give admin access to all agency groups
  const allAgencyGroups = await prisma.agencyGroup.findMany();
  for (const ag of allAgencyGroups) {
    await prisma.agencyGroupGrant.upsert({
      where: {
        contactId_agencyGroupId: {
          contactId: adminUser.id,
          agencyGroupId: ag.id,
        },
      },
      update: {},
      create: {
        contactId: adminUser.id,
        agencyGroupId: ag.id,
      },
    });
  }

  console.log(`  Created admin user: ${adminUser.email}`);

  // Test user (matches mock auth)
  const testUser = await prisma.contact.upsert({
    where: { email: 'test@usmax.com' },
    update: {},
    create: {
      cognitoId: 'mock-user-002',
      email: 'test@usmax.com',
      firstName: 'Test',
      lastName: 'User',
      isInternal: true,
      jobTitle: 'NDA Specialist',
      workPhone: '555-0101',
      emailSignature: 'Regards,\nTest User\nNDA Specialist\nUSmax Corporation',
    },
  });

  // Assign NDA User role
  await prisma.contactRole.upsert({
    where: {
      contactId_roleId: {
        contactId: testUser.id,
        roleId: ndaUserRole.id,
      },
    },
    update: {},
    create: {
      contactId: testUser.id,
      roleId: ndaUserRole.id,
    },
  });

  // Give test user access to DoD only
  await prisma.agencyGroupGrant.upsert({
    where: {
      contactId_agencyGroupId: {
        contactId: testUser.id,
        agencyGroupId: dodAgencyGroup.id,
      },
    },
    update: {},
    create: {
      contactId: testUser.id,
      agencyGroupId: dodAgencyGroup.id,
    },
  });

  console.log(`  Created test user: ${testUser.email}`);

  // Additional demo users
  const users = [];

  // Sarah Johnson - NDA User with DoD and Federal access
  const sarah = await prisma.contact.upsert({
    where: { email: 'sarah.johnson@usmax.com' },
    update: {},
    create: {
      cognitoId: 'mock-user-003',
      email: 'sarah.johnson@usmax.com',
      firstName: 'Sarah',
      lastName: 'Johnson',
      isInternal: true,
      jobTitle: 'Contracts Manager',
      workPhone: '555-0102',
      emailSignature: 'Best,\nSarah Johnson\nContracts Manager\nUSmax Corporation',
    },
  });
  await prisma.contactRole.upsert({
    where: { contactId_roleId: { contactId: sarah.id, roleId: ndaUserRole.id } },
    update: {},
    create: { contactId: sarah.id, roleId: ndaUserRole.id },
  });
  if (dodAgencyGroup) {
    await prisma.agencyGroupGrant.upsert({
      where: { contactId_agencyGroupId: { contactId: sarah.id, agencyGroupId: dodAgencyGroup.id } },
      update: {},
      create: { contactId: sarah.id, agencyGroupId: dodAgencyGroup.id },
    });
  }
  if (fedCivAgencyGroup) {
    await prisma.agencyGroupGrant.upsert({
      where: { contactId_agencyGroupId: { contactId: sarah.id, agencyGroupId: fedCivAgencyGroup.id } },
      update: {},
      create: { contactId: sarah.id, agencyGroupId: fedCivAgencyGroup.id },
    });
  }
  users.push(sarah);

  // Mike Davis - Limited User
  const mike = await prisma.contact.upsert({
    where: { email: 'mike.davis@usmax.com' },
    update: {},
    create: {
      cognitoId: 'mock-user-004',
      email: 'mike.davis@usmax.com',
      firstName: 'Mike',
      lastName: 'Davis',
      isInternal: true,
      jobTitle: 'Document Coordinator',
      workPhone: '555-0103',
      emailSignature: 'Thanks,\nMike Davis\nDocument Coordinator\nUSmax Corporation',
    },
  });
  if (limitedUserRole) {
    await prisma.contactRole.upsert({
      where: { contactId_roleId: { contactId: mike.id, roleId: limitedUserRole.id } },
      update: {},
      create: { contactId: mike.id, roleId: limitedUserRole.id },
    });
  }
  if (commAgencyGroup) {
    await prisma.agencyGroupGrant.upsert({
      where: { contactId_agencyGroupId: { contactId: mike.id, agencyGroupId: commAgencyGroup.id } },
      update: {},
      create: { contactId: mike.id, agencyGroupId: commAgencyGroup.id },
    });
  }
  users.push(mike);

  // Emily Chen - Read-Only User
  const emily = await prisma.contact.upsert({
    where: { email: 'emily.chen@usmax.com' },
    update: {},
    create: {
      cognitoId: 'mock-user-005',
      email: 'emily.chen@usmax.com',
      firstName: 'Emily',
      lastName: 'Chen',
      isInternal: true,
      jobTitle: 'Compliance Auditor',
      workPhone: '555-0104',
    },
  });
  if (readOnlyRole) {
    await prisma.contactRole.upsert({
      where: { contactId_roleId: { contactId: emily.id, roleId: readOnlyRole.id } },
      update: {},
      create: { contactId: emily.id, roleId: readOnlyRole.id },
    });
  }
  if (dodAgencyGroup) {
    await prisma.agencyGroupGrant.upsert({
      where: { contactId_agencyGroupId: { contactId: emily.id, agencyGroupId: dodAgencyGroup.id } },
      update: {},
      create: { contactId: emily.id, agencyGroupId: dodAgencyGroup.id },
    });
  }
  users.push(emily);

  // External contacts (not USmax employees)
  const externalContacts = [
    {
      email: 'john.smith@lockheedmartin.com',
      firstName: 'John',
      lastName: 'Smith',
      companyName: 'Lockheed Martin',
      jobTitle: 'Business Development Manager',
    },
    {
      email: 'jane.wilson@northropgrumman.com',
      firstName: 'Jane',
      lastName: 'Wilson',
      companyName: 'Northrop Grumman',
      jobTitle: 'Contracts Director',
    },
    {
      email: 'robert.brown@raytheon.com',
      firstName: 'Robert',
      lastName: 'Brown',
      companyName: 'Raytheon Technologies',
      jobTitle: 'Legal Counsel',
    },
  ];

  for (const extContact of externalContacts) {
    const contact = await prisma.contact.upsert({
      where: { email: extContact.email },
      update: {},
      create: {
        email: extContact.email,
        firstName: extContact.firstName,
        lastName: extContact.lastName,
        jobTitle: extContact.jobTitle,
        isInternal: false,
      },
    });
    users.push(contact);
  }

  console.log(`  Created ${users.length + 2} additional demo users`);

  return { adminUser, testUser, sarah, mike, emily, users };
}

async function seedRtfTemplates() {
  if (process.env.NODE_ENV === 'production') {
    console.log('Skipping RTF templates in production');
    return;
  }

  console.log('Seeding RTF templates...');

  const dodAgencyGroup = await prisma.agencyGroup.findUnique({ where: { code: 'DoD' } });
  const adminUser = await prisma.contact.findUnique({ where: { email: 'admin@usmax.com' } });

  // Generic template - Comprehensive professional NDA (replaces basic placeholder)
  const genericNdaRtf = `{\\rtf1\\ansi\\ansicpg1252\\deff0\\nouicompat\\deflang1033{\\fonttbl{\\f0\\fnil\\fcharset0 Times New Roman;}{\\f1\\fnil\\fcharset0 Arial;}}
{\\*\\generator Riched20 10.0.19041}\\viewkind4\\uc1
\\pard\\sa200\\sl276\\slmult1\\qc\\b\\f0\\fs32 NON-DISCLOSURE AGREEMENT\\par
\\pard\\sa200\\sl276\\slmult1\\qj\\b0\\fs24\\par
This Non-Disclosure Agreement (the \\"Agreement\\") is entered into as of {{effectiveDate}} (\\"Effective Date\\") by and between:\\par
\\par
\\pard\\sa200\\sl276\\slmult1\\b {{companyName}}\\b0\\par
{{companyCity}}, {{companyState}}\\par
State of Incorporation: {{stateOfIncorporation}}\\par
(hereinafter referred to as the \\"Disclosing Party\\")\\par
\\par
\\pard\\sa200\\sl276\\slmult1\\qc\\b and\\b0\\par
\\par
\\pard\\sa200\\sl276\\slmult1\\b United States Maximum, Inc. (USmax)\\b0\\par
A United States Corporation\\par
(hereinafter referred to as the \\"Receiving Party\\")\\par
\\par
\\pard\\sa200\\sl276\\slmult1\\qc\\b RECITALS\\b0\\par
\\par
\\pard\\sa200\\sl276\\slmult1\\qj WHEREAS, the parties desire to explore a potential business relationship relating to {{authorizedPurpose}} (the \\"Purpose\\"); and\\par
\\par
WHEREAS, in connection with discussions regarding the Purpose, Disclosing Party may disclose certain confidential and proprietary information to Receiving Party;\\par
\\par
NOW, THEREFORE, in consideration of the mutual covenants and agreements contained herein, and for other good and valuable consideration, the receipt and sufficiency of which are hereby acknowledged, the parties agree as follows:\\par
\\par
\\b 1. DEFINITION OF CONFIDENTIAL INFORMATION\\b0\\par
\\par
\\"Confidential Information\\" means all information, whether written, oral, electronic, visual, or in any other form, disclosed by Disclosing Party to Receiving Party that is designated as confidential or that reasonably should be understood to be confidential given the nature of the information and the circumstances of disclosure. Confidential Information includes, without limitation:\\par
\\par
\\pard\\fi-360\\li720\\sa200\\sl276\\slmult1 (a)\\tab Technical data, trade secrets, know-how, research, product plans, products, services, customers, markets, software, developments, inventions, processes, formulas, technology, designs, drawings, engineering, hardware configuration information, and marketing strategies;\\par
(b)\\tab Business information, including cost information, profits, sales information, accounting and unpublished financial information, business plans, and internal performance data;\\par
(c)\\tab Proprietary information of third parties that Disclosing Party is obligated to keep confidential;\\par
(d)\\tab Any other information designated as \\"Confidential\\", \\"Proprietary\\", or bearing a similar legend.\\par
\\par
\\pard\\sa200\\sl276\\slmult1\\qj\\b 2. OBLIGATIONS OF RECEIVING PARTY\\b0\\par
\\par
Receiving Party agrees to:\\par
\\par
\\pard\\fi-360\\li720\\sa200\\sl276\\slmult1 (a)\\tab Hold and maintain the Confidential Information in strict confidence using the same degree of care it uses to protect its own confidential information, but in no event less than reasonable care;\\par
(b)\\tab Not disclose any Confidential Information to third parties without the prior written consent of Disclosing Party;\\par
(c)\\tab Not use the Confidential Information for any purpose other than the Purpose;\\par
(d)\\tab Limit access to Confidential Information to employees, consultants, and advisors who have a legitimate need to know and who have been informed of the confidential nature of such information;\\par
(e)\\tab Reproduce Confidential Information only to the extent necessary for the Purpose, and ensure all reproductions contain the same proprietary and confidential notices.\\par
\\par
\\pard\\sa200\\sl276\\slmult1\\qj\\b 3. EXCLUSIONS FROM CONFIDENTIAL INFORMATION\\b0\\par
\\par
Confidential Information shall not include information that:\\par
\\par
\\pard\\fi-360\\li720\\sa200\\sl276\\slmult1 (a)\\tab Was publicly known and made generally available prior to disclosure by Disclosing Party;\\par
(b)\\tab Becomes publicly known and made generally available after disclosure by Disclosing Party through no action or inaction of Receiving Party;\\par
(c)\\tab Was in the possession of Receiving Party, without confidentiality restrictions, prior to disclosure by Disclosing Party;\\par
(d)\\tab Was rightfully disclosed to Receiving Party by a third party without confidentiality restrictions;\\par
(e)\\tab Was independently developed by Receiving Party without use of or reference to the Confidential Information.\\par
\\par
\\pard\\sa200\\sl276\\slmult1\\qj\\b 4. TERM AND TERMINATION\\b0\\par
\\par
This Agreement shall remain in effect for a period of three (3) years from the Effective Date unless earlier terminated by either party upon thirty (30) days written notice. The obligations of Receiving Party under this Agreement shall survive termination and continue for a period of five (5) years from the date of disclosure.\\par
\\par
\\b 5. RETURN OF MATERIALS\\b0\\par
\\par
Upon request by Disclosing Party, or upon termination of this Agreement, Receiving Party shall promptly return or destroy all Confidential Information in its possession, including all copies, notes, and derivatives thereof, and shall certify in writing to Disclosing Party that such return or destruction has been completed.\\par
\\par
\\b 6. NO LICENSE\\b0\\par
\\par
Nothing in this Agreement grants any license, by implication or otherwise, under any patent, copyright, trade secret, or other intellectual property right. All Confidential Information remains the property of Disclosing Party.\\par
\\par
\\b 7. GOVERNMENT CONTRACT COMPLIANCE\\b0\\par
\\par
Agency: {{agencyGroupName}}\\par
Subagency/Office: {{subagencyName}}\\par
Contract Office: {{agencyOfficeName}}\\par
\\par
The parties acknowledge that this Agreement may involve work related to United States government contracts. Both parties agree to comply with all applicable federal regulations.\\par
\\par
\\b 8. AUTHORIZED REPRESENTATIVES\\b0\\par
\\par
For purposes of this Agreement, the authorized representatives are:\\par
\\par
\\b For {{companyName}}:\\b0\\par
Relationship Manager: {{relationshipPocName}}\\par
{\\i Contracts Administrator: {{contractsPocName}}}\\par
\\par
\\b For USmax:\\b0\\par
Business Opportunity Lead: {{opportunityPocName}}\\par
\\par
\\b 9. GENERAL PROVISIONS\\b0\\par
\\par
9.1 {\\b Governing Law}: This Agreement shall be governed by and construed in accordance with the laws of the United States and the State of {{stateOfIncorporation}}, without regard to its conflict of law provisions.\\par
\\par
9.2 {\\b Entire Agreement}: This Agreement constitutes the entire agreement between the parties with respect to the subject matter hereof and supersedes all prior agreements and understandings, whether written or oral.\\par
\\par
9.3 {\\b Amendment}: This Agreement may not be amended except by a written instrument signed by both parties.\\par
\\par
9.4 {\\b Severability}: If any provision of this Agreement is held to be invalid or unenforceable, the remaining provisions shall continue in full force and effect.\\par
\\par
9.5 {\\b Waiver}: The failure of either party to enforce any provision of this Agreement shall not be construed as a waiver of such provision or the right to enforce it.\\par
\\par
\\pard\\sa200\\sl276\\slmult1\\qc\\b IN WITNESS WHEREOF\\b0 , the parties have executed this Agreement as of the date first written above.\\par
\\par
\\pard\\sa200\\sl276\\slmult1\\qj\\b {{companyName}}\\b0\\par
\\par
\\par
By: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\par
Name: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\par
Title: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\par
Date: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\par
\\par
\\par
\\b UNITED STATES MAXIMUM, INC.\\b0\\par
\\par
\\par
By: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\par
Name: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\par
Title: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\par
Date: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\par
\\par
\\pard\\sa200\\sl276\\slmult1\\qr\\fs20 Document Reference: {{abbreviatedName}}\\par
Generated: {{generatedDate}}\\par
}`;

  await prisma.rtfTemplate.upsert({
    where: { id: '00000000-0000-0000-0000-000000000001' },
    update: { content: Buffer.from(genericNdaRtf) },
    create: {
      id: '00000000-0000-0000-0000-000000000001',
      name: 'Standard NDA Template',
      description: 'Comprehensive professional NDA template for all agencies with full legal clauses',
      content: Buffer.from(genericNdaRtf),
      isDefault: true,
      isActive: true,
      createdById: adminUser?.id,
    },
  });

  // DoD-specific template - Enhanced with government compliance clauses
  if (dodAgencyGroup && adminUser) {
    const dodNdaRtf = `{\\rtf1\\ansi\\ansicpg1252\\deff0\\nouicompat\\deflang1033{\\fonttbl{\\f0\\fnil\\fcharset0 Times New Roman;}}
{\\*\\generator Riched20 10.0.19041}\\viewkind4\\uc1
\\pard\\sa200\\sl276\\slmult1\\qc\\b\\f0\\fs32 DEPARTMENT OF DEFENSE\\par
NON-DISCLOSURE AGREEMENT\\par
\\pard\\sa200\\sl276\\slmult1\\qj\\b0\\fs24\\par
This Non-Disclosure Agreement (the \\"Agreement\\") is entered into as of {{effectiveDate}} between:\\par
\\par
\\b {{companyName}}\\b0\\par
{{companyCity}}, {{companyState}}\\par
State of Incorporation: {{stateOfIncorporation}}\\par
(hereinafter \\"Contractor\\")\\par
\\par
\\pard\\sa200\\sl276\\slmult1\\qc\\b and\\b0\\par
\\par
\\pard\\sa200\\sl276\\slmult1\\b United States Maximum, Inc. (USmax)\\b0\\par
Prime Contractor for {{agencyGroupName}}\\par
Contract Office: {{agencyOfficeName}}\\par
(hereinafter \\"Prime Contractor\\")\\par
\\par
\\pard\\sa200\\sl276\\slmult1\\qc\\b RECITALS\\b0\\par
\\par
\\pard\\sa200\\sl276\\slmult1\\qj WHEREAS, Prime Contractor is engaged in work for the United States Department of Defense under {{agencyGroupName}} - {{subagencyName}};\\par
\\par
WHEREAS, in connection with {{authorizedPurpose}}, Prime Contractor may disclose certain information subject to federal security regulations and Department of Defense guidelines;\\par
\\par
WHEREAS, Contractor acknowledges that certain information may be subject to International Traffic in Arms Regulations (ITAR) or Export Administration Regulations (EAR);\\par
\\par
NOW, THEREFORE, the parties agree as follows:\\par
\\par
\\b 1. DEFINITION OF CONTROLLED INFORMATION\\b0\\par
\\par
\\"Controlled Information\\" includes all information disclosed by Prime Contractor that is:\\par
\\par
\\pard\\fi-360\\li720\\sa200\\sl276\\slmult1 (a)\\tab Marked as \\"Controlled Unclassified Information\\" (CUI), \\"For Official Use Only\\" (FOUO), or similar designation;\\par
(b)\\tab Technical data related to defense articles or defense services;\\par
(c)\\tab Procurement sensitive information;\\par
(d)\\tab Contractor proprietary information related to government programs;\\par
(e)\\tab Any other information that reasonable persons would understand requires protection under federal regulations.\\par
\\par
\\pard\\sa200\\sl276\\slmult1\\qj\\b 2. OBLIGATIONS AND RESTRICTIONS\\b0\\par
\\par
Contractor agrees to:\\par
\\par
\\pard\\fi-360\\li720\\sa200\\sl276\\slmult1 (a)\\tab Protect Controlled Information in accordance with NIST SP 800-171 and DFARS 252.204-7012 requirements;\\par
(b)\\tab Maintain physical and electronic security measures adequate to prevent unauthorized disclosure;\\par
(c)\\tab Limit access to U.S. persons only, unless export authorization is obtained;\\par
(d)\\tab Report any suspected or actual unauthorized disclosure within 72 hours;\\par
(e)\\tab Not use Controlled Information except as authorized for the Purpose.\\par
\\par
\\pard\\sa200\\sl276\\slmult1\\qj\\b 3. EXPORT CONTROL COMPLIANCE\\b0\\par
\\par
Contractor acknowledges that Controlled Information may be subject to U.S. export control laws including ITAR and EAR. Contractor agrees to comply with all applicable export control regulations and obtain all necessary licenses before any export or re-export.\\par
\\par
\\b 4. GOVERNMENT ACCESS RIGHTS\\b0\\par
\\par
Contractor acknowledges that the U.S. Government retains certain rights to access and audit information related to this Agreement in accordance with applicable federal acquisition regulations.\\par
\\par
\\b 5. CYBER INCIDENT REPORTING\\b0\\par
\\par
Contractor shall report cyber incidents affecting Controlled Information to Prime Contractor and the Department of Defense in accordance with DFARS 252.204-7012 within 72 hours of discovery.\\par
\\par
\\b 6. TERM\\b0\\par
\\par
This Agreement remains in effect for five (5) years from the Effective Date. Obligations regarding Controlled Information survive termination indefinitely or until such information is properly declassified.\\par
\\par
\\b 7. AUTHORIZED CONTACTS\\b0\\par
\\par
\\b For {{companyName}}:\\b0\\par
Security Officer: {{relationshipPocName}}\\par
Contracts: {{contractsPocName}}\\par
\\par
\\b For USmax:\\b0\\par
Program Manager: {{opportunityPocName}}\\par
\\par
\\b 8. GENERAL PROVISIONS\\b0\\par
\\par
8.1 {\\b Governing Law}: This Agreement shall be governed by federal law and regulations applicable to Department of Defense contractors.\\par
\\par
8.2 {\\b Flowdown}: Contractor shall flow down equivalent protections to any subcontractors requiring access to Controlled Information.\\par
\\par
8.3 {\\b Precedence}: In the event of conflict between this Agreement and applicable federal regulations, the regulations shall take precedence.\\par
\\par
\\pard\\sa200\\sl276\\slmult1\\qc\\b IN WITNESS WHEREOF\\b0 , the parties have executed this Agreement.\\par
\\par
\\pard\\sa200\\sl276\\slmult1\\qj\\b {{companyName}}\\b0\\par
\\par
By: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\par
Name: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\par
Title: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\par
Date: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\par
\\par
\\b UNITED STATES MAXIMUM, INC.\\b0\\par
\\par
By: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\par
Name: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\par
Title: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\par
Date: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\par
\\par
\\pard\\sa200\\sl276\\slmult1\\qr\\fs20 DoD Contract Reference: {{abbreviatedName}}\\par
Generated: {{generatedDate}}\\par
CAGE Code: [To be added]\\par
}`;

    await prisma.rtfTemplate.upsert({
      where: { id: '00000000-0000-0000-0000-000000000002' },
      update: { content: Buffer.from(dodNdaRtf) },
      create: {
        id: '00000000-0000-0000-0000-000000000002',
        name: 'DoD NDA Template',
        description: 'Department of Defense specific NDA with CUI, ITAR, and DFARS compliance clauses',
        content: Buffer.from(dodNdaRtf),
        agencyGroupId: dodAgencyGroup.id,
        isDefault: false,
        isActive: true,
        createdById: adminUser.id,
      },
    });
  }

  // Standard Mutual NDA Template (comprehensive example)
  if (adminUser) {
    const mutualNdaRtf = `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0 Times New Roman;}{\\f1 Arial;}}
{\\colortbl;\\red0\\green0\\blue0;\\red0\\green0\\blue255;}
\\f0\\fs24

{\\b\\fs28 MUTUAL NON-DISCLOSURE AGREEMENT}\\par
\\par
This Mutual Non-Disclosure Agreement (the "Agreement") is entered into as of {{effectiveDate}} ("Effective Date") by and between:\\par
\\par
{\\b {{companyName}}}\\par
{{companyCity}}, {{companyState}}\\par
State of Incorporation: {{stateOfIncorporation}}\\par
\\par
and\\par
\\par
{\\b United States Maximum, Inc. (USmax)}\\par
\\par
{\\b RECITALS}\\par
\\par
WHEREAS, the parties wish to explore a business opportunity (the "Purpose") relating to {{authorizedPurpose}};\\par
\\par
WHEREAS, in connection with the Purpose, each party may disclose to the other certain confidential and proprietary information;\\par
\\par
NOW, THEREFORE, in consideration of the mutual covenants and agreements contained herein, the parties agree as follows:\\par
\\par
{\\b 1. CONFIDENTIAL INFORMATION}\\par
\\par
"Confidential Information" means all information disclosed by either party ("Disclosing Party") to the other party ("Receiving Party"), whether orally or in writing, that is designated as confidential or that reasonably should be understood to be confidential given the nature of the information and the circumstances of disclosure.\\par
\\par
{\\b 2. OBLIGATIONS}\\par
\\par
The Receiving Party agrees to:\\par
(a) Hold and maintain the Confidential Information in strict confidence;\\par
(b) Not disclose the Confidential Information to any third parties without prior written consent;\\par
(c) Use the Confidential Information solely for the Purpose.\\par
\\par
{\\b 3. TERM}\\par
\\par
This Agreement shall remain in effect for a period of three (3) years from the Effective Date.\\par
\\par
{\\b 4. AUTHORIZED REPRESENTATIVES}\\par
\\par
Primary Contact: {{relationshipPocName}}\\par
Contracts Administrator: {{contractsPocName}}\\par
Business Opportunity Lead: {{opportunityPocName}}\\par
\\par
{\\b IN WITNESS WHEREOF}, the parties have executed this Agreement as of {{generatedDate}}.\\par
\\par
{\\b {{companyName}}}\\line
By: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\line
Name: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\line
Title: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\par
\\par
{\\b UNITED STATES MAXIMUM, INC.}\\line
By: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\line
Name: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\line
Title: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\par
}`;

    await prisma.rtfTemplate.upsert({
      where: { id: '00000000-0000-0000-0000-000000000003' },
      update: { content: Buffer.from(mutualNdaRtf) },
      create: {
        id: '00000000-0000-0000-0000-000000000003',
        name: 'Mutual NDA (Bidirectional)',
        description: 'Mutual NDA where both parties exchange confidential information',
        content: Buffer.from(mutualNdaRtf),
        isDefault: false,
        isActive: true,
        createdById: adminUser.id,
      },
    });
  }

  // Consultant/Contractor Agreement Template - Enhanced
  if (adminUser) {
    const consultantNdaRtf = `{\\rtf1\\ansi\\ansicpg1252\\deff0\\nouicompat\\deflang1033{\\fonttbl{\\f0\\fnil\\fcharset0 Times New Roman;}}
{\\*\\generator Riched20 10.0.19041}\\viewkind4\\uc1
\\pard\\sa200\\sl276\\slmult1\\qc\\b\\f0\\fs32 CONSULTANT/CONTRACTOR\\par
NON-DISCLOSURE AGREEMENT\\par
\\pard\\sa200\\sl276\\slmult1\\qj\\b0\\fs24\\par
This Consultant Non-Disclosure Agreement (the \\"Agreement\\") is made effective as of {{effectiveDate}} between:\\par
\\par
\\b CONSULTANT:\\b0\\par
{{companyName}}\\par
{{companyCity}}, {{companyState}}\\par
State of Incorporation: {{stateOfIncorporation}}\\par
(hereinafter \\"Consultant\\")\\par
\\par
\\pard\\sa200\\sl276\\slmult1\\qc\\b and\\b0\\par
\\par
\\pard\\sa200\\sl276\\slmult1\\b CLIENT:\\b0\\par
United States Maximum, Inc.\\par
(hereinafter \\"Client\\")\\par
\\par
\\pard\\sa200\\sl276\\slmult1\\qc\\b ENGAGEMENT DETAILS\\b0\\par
\\par
\\pard\\sa200\\sl276\\slmult1\\qj\\b Project/Engagement:\\b0 {{authorizedPurpose}}\\par
\\b Government Agency:\\b0 {{agencyGroupName}}\\par
\\b Subagency/Office:\\b0 {{subagencyName}}\\par
\\b Reference:\\b0 {{abbreviatedName}}\\par
\\par
\\b AGREEMENT:\\b0\\par
\\par
\\b 1. CONFIDENTIAL INFORMATION\\b0\\par
\\par
\\"Confidential Information\\" means all proprietary, technical, business, and financial information disclosed by Client to Consultant in connection with the engagement, including but not limited to:\\par
\\par
\\pard\\fi-360\\li720\\sa200\\sl276\\slmult1 (a)\\tab Client's business plans, strategies, methods, and practices;\\par
(b)\\tab Technical specifications, designs, processes, and procedures;\\par
(c)\\tab Customer information, pricing, and financial data;\\par
(d)\\tab Government contract information and proposal data;\\par
(e)\\tab Information marked as confidential or proprietary;\\par
(f)\\tab Work product developed during the engagement.\\par
\\par
\\pard\\sa200\\sl276\\slmult1\\qj\\b 2. CONSULTANT OBLIGATIONS\\b0\\par
\\par
Consultant agrees to:\\par
\\par
\\pard\\fi-360\\li720\\sa200\\sl276\\slmult1 (a)\\tab Maintain Confidential Information in strict confidence;\\par
(b)\\tab Use Confidential Information solely for performing services under this engagement;\\par
(c)\\tab Not disclose Confidential Information to any third party without prior written authorization;\\par
(d)\\tab Protect Confidential Information with at least the same degree of care used to protect Consultant's own confidential information;\\par
(e)\\tab Limit access to Confidential Information to Consultant's employees or subcontractors who need to know and who are bound by similar confidentiality obligations;\\par
(f)\\tab Not reverse engineer, decompile, or disassemble any software or technical materials provided by Client.\\par
\\par
\\pard\\sa200\\sl276\\slmult1\\qj\\b 3. OWNERSHIP AND INTELLECTUAL PROPERTY\\b0\\par
\\par
All Confidential Information, including pre-existing materials provided by Client and work product developed under the engagement, remains the exclusive property of Client. Consultant assigns to Client all rights, title, and interest in any deliverables or work product created during the engagement.\\par
\\par
\\b 4. NO LICENSE GRANTED\\b0\\par
\\par
This Agreement does not grant Consultant any license or rights to Client's intellectual property, patents, copyrights, trade secrets, or trademarks, except as expressly necessary to perform the consulting services.\\par
\\par
\\b 5. RETURN OF MATERIALS\\b0\\par
\\par
Upon termination of the engagement or upon request, Consultant shall immediately return or destroy all Confidential Information, including all copies, notes, and work product, and certify in writing that such return or destruction has been completed.\\par
\\par
\\b 6. NON-COMPETE AND NON-SOLICITATION\\b0\\par
\\par
During the term of the engagement and for one (1) year thereafter, Consultant shall not, without Client's prior written consent:\\par
\\par
\\pard\\fi-360\\li720\\sa200\\sl276\\slmult1 (a)\\tab Compete directly with Client in areas related to the engagement;\\par
(b)\\tab Solicit or recruit Client's employees or other consultants;\\par
(c)\\tab Solicit Client's customers for competing services.\\par
\\par
\\pard\\sa200\\sl276\\slmult1\\qj\\b 7. TERM AND SURVIVAL\\b0\\par
\\par
This Agreement is effective from {{effectiveDate}} and remains in effect for the duration of the consulting engagement plus three (3) years. Confidentiality obligations survive termination indefinitely.\\par
\\par
\\b 8. GOVERNMENT CONTRACT COMPLIANCE\\b0\\par
\\par
Consultant acknowledges this engagement involves work for {{agencyGroupName}} - {{subagencyName}}. Consultant agrees to comply with all applicable federal regulations, including FAR and DFARS provisions.\\par
\\par
\\b 9. AUTHORIZED REPRESENTATIVES\\b0\\par
\\par
\\b For {{companyName}}:\\b0\\par
Primary Contact: {{relationshipPocName}}\\par
Contracts: {{contractsPocName}}\\par
\\par
\\b For USmax:\\b0\\par
Project Manager: {{opportunityPocName}}\\par
\\par
\\b 10. REMEDIES\\b0\\par
\\par
Consultant acknowledges that breach of this Agreement may cause irreparable harm to Client for which monetary damages may be inadequate. Client shall be entitled to seek equitable relief, including injunction and specific performance, in addition to all other remedies available at law or in equity.\\par
\\par
\\b 11. GENERAL PROVISIONS\\b0\\par
\\par
11.1 {\\b Governing Law}: Delaware law governs this Agreement.\\par
\\par
11.2 {\\b Severability}: Invalid provisions shall be severed without affecting the remainder of the Agreement.\\par
\\par
11.3 {\\b Entire Agreement}: This Agreement constitutes the entire agreement regarding confidentiality between the parties.\\par
\\par
11.4 {\\b Independent Contractor}: Consultant is an independent contractor, not an employee or agent of Client.\\par
\\par
\\pard\\sa200\\sl276\\slmult1\\qc\\b IN WITNESS WHEREOF\\b0 , the parties have executed this Agreement.\\par
\\par
\\pard\\sa200\\sl276\\slmult1\\qj\\b {{companyName}} (Consultant)\\b0\\par
\\par
By: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\par
Name: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\par
Title: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\par
Date: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\par
\\par
\\b UNITED STATES MAXIMUM, INC. (Client)\\b0\\par
\\par
By: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\par
Name: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\par
Title: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\par
Date: \\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\par
\\par
\\pard\\sa200\\sl276\\slmult1\\qr\\fs20 Engagement Reference: {{abbreviatedName}}\\par
Document Generated: {{generatedDate}}\\par
}`;

    await prisma.rtfTemplate.upsert({
      where: { id: '00000000-0000-0000-0000-000000000004' },
      update: { content: Buffer.from(consultantNdaRtf) },
      create: {
        id: '00000000-0000-0000-0000-000000000004',
        name: 'Consultant/Contractor NDA',
        description: 'Professional NDA for consultant and contractor engagements with IP assignment clauses',
        content: Buffer.from(consultantNdaRtf),
        isDefault: false,
        isActive: true,
        createdById: adminUser.id,
      },
    });
  }

  // Federal Agency Template
  const federalAgencyGroup = await prisma.agencyGroup.findUnique({ where: { code: 'Federal' } });
  if (federalAgencyGroup && adminUser) {
    const federalNdaRtf = `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0 Times New Roman;}}
\\f0\\fs24

{\\b\\fs28 FEDERAL AGENCY NON-DISCLOSURE AGREEMENT}\\par
{\\i For Use with Federal Government Partners}\\par
\\par
{\\b Agreement Date:} {{effectiveDate}}\\par
{\\b Agency:} {{agencyGroupName}}\\par
{\\b Office:} {{agencyOfficeName}}\\par
{\\b Partner Organization:} {{companyName}}\\par
\\par
{\\b PURPOSE}\\par
\\par
This Agreement governs the exchange of information between USmax and {{companyName}} for the purpose of {{authorizedPurpose}}.\\par
\\par
{\\b CONFIDENTIALITY OBLIGATIONS}\\par
\\par
Both parties agree to:\\par
{\\pard\\li720 1. Protect disclosed information with the same degree of care used for own confidential information\\par}
{\\pard\\li720 2. Limit access to authorized personnel only\\par}
{\\pard\\li720 3. Not use information for purposes other than those specified\\par}
{\\pard\\li720 4. Return or destroy information upon request\\par}
\\par
{\\b CONTACTS}\\par
\\par
USmax Position: {{usMaxPosition}}\\par
Relationship Manager: {{relationshipPocName}}\\par
Contract Administrator: {{contractsPocName}}\\par
\\par
{\\b COMPLIANCE}\\par
\\par
This agreement complies with Federal Acquisition Regulation (FAR) requirements and includes provisions for handling Controlled Unclassified Information (CUI).\\par
\\par
{\\b SIGNATURES}\\par
\\par
{{companyName}}\\par
\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\par
Authorized Representative\\par
\\par
United States Maximum, Inc.\\par
\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\_\\par
Authorized Representative\\par
\\par
Date: {{generatedDate}}\\par
}`;

    await prisma.rtfTemplate.upsert({
      where: { id: '00000000-0000-0000-0000-000000000005' },
      update: { content: Buffer.from(federalNdaRtf) },
      create: {
        id: '00000000-0000-0000-0000-000000000005',
        name: 'Federal Agency NDA',
        description: 'NDA template for federal government agencies with FAR compliance',
        content: Buffer.from(federalNdaRtf),
        agencyGroupId: federalAgencyGroup.id,
        isDefault: false,
        isActive: true,
        createdById: adminUser.id,
      },
    });
  }

  console.log('  ✅ Created/updated 5 professional RTF templates:');
  console.log('     - Standard NDA Template (default, all agencies)');
  console.log('     - DoD NDA Template (CUI/ITAR/DFARS compliance)');
  console.log('     - Mutual NDA (bidirectional exchange)');
  console.log('     - Consultant/Contractor NDA (IP assignment)');
  console.log('     - Federal Agency NDA (FAR compliance)');
}

async function seedSystemConfig() {
  if (process.env.NODE_ENV === 'production') {
    console.log('Skipping system config in production');
    return;
  }

  console.log('Seeding system configuration...');

  const configs = [
    { key: 'dashboard.stale_days', value: '30' },
    { key: 'dashboard.almost_stale_days', value: '21' },
    { key: 'email.from_address', value: 'noreply@usmax.com' },
    { key: 'email.from_name', value: 'USmax NDA System' },
    { key: 's3.bucket_name', value: 'usmax-nda-documents-dev' },
    { key: 's3.region', value: 'us-east-1' },
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: { value: config.value },
      create: config,
    });
  }

  console.log(`  Created ${configs.length} configuration entries`);
}

async function seedNdas() {
  if (process.env.NODE_ENV === 'production') {
    console.log('Skipping sample NDAs in production');
    return;
  }

  console.log('Seeding sample NDAs...');

  const adminUser = await prisma.contact.findUnique({ where: { email: 'admin@usmax.com' } });
  const testUser = await prisma.contact.findUnique({ where: { email: 'test@usmax.com' } });
  const sarah = await prisma.contact.findUnique({ where: { email: 'sarah.johnson@usmax.com' } });

  const dodAgencyGroup = await prisma.agencyGroup.findUnique({ where: { code: 'DoD' } });
  const fedCivAgencyGroup = await prisma.agencyGroup.findUnique({ where: { code: 'FedCiv' } });
  const commAgencyGroup = await prisma.agencyGroup.findUnique({ where: { code: 'COMM' } });

  const usaf = await prisma.subagency.findFirst({ where: { code: 'USAF' } });
  const usa = await prisma.subagency.findFirst({ where: { code: 'USA' } });
  const dhs = await prisma.subagency.findFirst({ where: { code: 'DHS' } });

  if (!adminUser || !testUser || !dodAgencyGroup) {
    console.warn('  Skipping sample NDAs - required users/agencies not found');
    return;
  }

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
  const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

  // NDA 1 - Fully Executed (old)
  const nda1 = await prisma.nda.create({
    data: {
      companyName: 'Lockheed Martin Corporation',
      companyCity: 'Bethesda',
      companyState: 'MD',
      stateOfIncorporation: 'Maryland',
      agencyGroupId: dodAgencyGroup.id,
      subagencyId: usaf?.id,
      agencyOfficeName: 'Air Force Research Laboratory',
      abbreviatedName: 'LMC-AFRL',
      authorizedPurpose: 'Advanced radar system development proposal',
      effectiveDate: ninetyDaysAgo,
      usMaxPosition: 'PRIME',
      status: 'FULLY_EXECUTED',
      fullyExecutedDate: sixtyDaysAgo,
      opportunityPocId: sarah?.id || testUser.id,
      contractsPocId: adminUser.id,
      relationshipPocId: testUser.id,
      createdById: adminUser.id,
      createdAt: ninetyDaysAgo,
    },
  });

  // Create status history for NDA 1
  await prisma.ndaStatusHistory.createMany({
    data: [
      { ndaId: nda1.id, status: 'CREATED', changedAt: ninetyDaysAgo, changedById: adminUser.id },
      { ndaId: nda1.id, status: 'SENT_PENDING_SIGNATURE', changedAt: new Date(ninetyDaysAgo.getTime() + 24 * 60 * 60 * 1000), changedById: adminUser.id },
      { ndaId: nda1.id, status: 'IN_REVISION', changedAt: new Date(ninetyDaysAgo.getTime() + 7 * 24 * 60 * 60 * 1000), changedById: adminUser.id },
      { ndaId: nda1.id, status: 'FULLY_EXECUTED', changedAt: sixtyDaysAgo, changedById: adminUser.id },
    ],
  });

  // Add documents to NDA 1
  await prisma.document.create({
    data: {
      ndaId: nda1.id,
      filename: 'NDA_LMC_AFRL_v1.pdf',
      s3Key: 'dev/ndas/nda-1/NDA_LMC_AFRL_v1.pdf',
      documentType: 'GENERATED',
      fileType: 'application/pdf',
      fileSize: 245678,
      versionNumber: 1,
      uploadedById: adminUser.id,
      uploadedAt: ninetyDaysAgo,
    },
  });

  await prisma.document.create({
    data: {
      ndaId: nda1.id,
      filename: 'NDA_LMC_AFRL_Executed.pdf',
      s3Key: 'dev/ndas/nda-1/NDA_LMC_AFRL_Executed.pdf',
      documentType: 'FULLY_EXECUTED',
      fileType: 'application/pdf',
      fileSize: 267890,
      isFullyExecuted: true,
      versionNumber: 2,
      notes: 'Signed by both parties',
      uploadedById: adminUser.id,
      uploadedAt: sixtyDaysAgo,
    },
  });

  // NDA 2 - Recently Emailed
  const nda2 = await prisma.nda.create({
    data: {
      companyName: 'Northrop Grumman Corporation',
      companyCity: 'Falls Church',
      companyState: 'VA',
      stateOfIncorporation: 'Delaware',
      agencyGroupId: dodAgencyGroup.id,
      subagencyId: usa?.id,
      agencyOfficeName: 'Army Contracting Command',
      abbreviatedName: 'NGC-ACC',
      authorizedPurpose: 'Joint communications platform evaluation',
      effectiveDate: thirtyDaysAgo,
      usMaxPosition: 'SUB_CONTRACTOR',
      status: 'SENT_PENDING_SIGNATURE',
      opportunityPocId: testUser.id,
      relationshipPocId: sarah?.id || testUser.id,
      createdById: testUser.id,
      createdAt: thirtyDaysAgo,
    },
  });

  await prisma.ndaStatusHistory.createMany({
    data: [
      { ndaId: nda2.id, status: 'CREATED', changedAt: thirtyDaysAgo, changedById: testUser.id },
      { ndaId: nda2.id, status: 'SENT_PENDING_SIGNATURE', changedAt: new Date(thirtyDaysAgo.getTime() + 2 * 24 * 60 * 60 * 1000), changedById: testUser.id },
    ],
  });

  await prisma.document.create({
    data: {
      ndaId: nda2.id,
      filename: 'NDA_NGC_ACC_v1.pdf',
      s3Key: 'dev/ndas/nda-2/NDA_NGC_ACC_v1.pdf',
      documentType: 'GENERATED',
      fileType: 'application/pdf',
      fileSize: 198432,
      versionNumber: 1,
      uploadedById: testUser.id,
      uploadedAt: thirtyDaysAgo,
    },
  });

  // Add email record
  await prisma.ndaEmail.create({
    data: {
      ndaId: nda2.id,
      subject: 'NDA for Joint Communications Platform Evaluation',
      toRecipients: ['jane.wilson@northropgrumman.com'],
      ccRecipients: [testUser.email],
      bccRecipients: [],
      body: 'Please find attached the NDA for review and signature.',
      sentById: testUser.id,
      sentAt: new Date(thirtyDaysAgo.getTime() + 2 * 24 * 60 * 60 * 1000),
      status: 'DELIVERED',
    },
  });

  // NDA 3 - In Revision
  const nda3 = await prisma.nda.create({
    data: {
      companyName: 'Raytheon Technologies',
      companyCity: 'Arlington',
      companyState: 'VA',
      stateOfIncorporation: 'Delaware',
      agencyGroupId: fedCivAgencyGroup?.id || dodAgencyGroup.id,
      subagencyId: dhs?.id,
      agencyOfficeName: 'Cybersecurity and Infrastructure Security Agency',
      abbreviatedName: 'RTX-CISA',
      authorizedPurpose: 'Critical infrastructure protection technology assessment',
      effectiveDate: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      usMaxPosition: 'OTHER',
      status: 'IN_REVISION',
      opportunityPocId: sarah?.id || adminUser.id,
      relationshipPocId: adminUser.id,
      createdById: sarah?.id || adminUser.id,
      createdAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.ndaStatusHistory.createMany({
    data: [
      { ndaId: nda3.id, status: 'CREATED', changedAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000), changedById: sarah?.id || adminUser.id },
      { ndaId: nda3.id, status: 'SENT_PENDING_SIGNATURE', changedAt: new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000), changedById: sarah?.id || adminUser.id },
      { ndaId: nda3.id, status: 'IN_REVISION', changedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000), changedById: sarah?.id || adminUser.id },
    ],
  });

  await prisma.document.createMany({
    data: [
      {
        ndaId: nda3.id,
        filename: 'NDA_RTX_CISA_v1.pdf',
        s3Key: 'dev/ndas/nda-3/NDA_RTX_CISA_v1.pdf',
        documentType: 'GENERATED',
        fileType: 'application/pdf',
        fileSize: 212345,
        versionNumber: 1,
        uploadedById: sarah?.id || adminUser.id,
        uploadedAt: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
      },
      {
        ndaId: nda3.id,
        filename: 'NDA_RTX_CISA_v2_redlines.pdf',
        s3Key: 'dev/ndas/nda-3/NDA_RTX_CISA_v2_redlines.pdf',
        documentType: 'UPLOADED',
        fileType: 'application/pdf',
        fileSize: 298765,
        versionNumber: 2,
        notes: 'Client redlines - requested changes to liability clause',
        uploadedById: adminUser.id,
        uploadedAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  // NDA 4 - Just Created
  const nda4 = await prisma.nda.create({
    data: {
      companyName: 'SAIC Inc',
      companyCity: 'Reston',
      companyState: 'VA',
      stateOfIncorporation: 'Delaware',
      agencyGroupId: dodAgencyGroup.id,
      abbreviatedName: 'SAIC-DoD',
      authorizedPurpose: 'Cloud migration strategy proposal',
      effectiveDate: now,
      usMaxPosition: 'PRIME',
      status: 'CREATED',
      opportunityPocId: testUser.id,
      relationshipPocId: testUser.id,
      createdById: testUser.id,
      createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
  });

  await prisma.ndaStatusHistory.create({
    data: {
      ndaId: nda4.id,
      status: 'CREATED',
      changedAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      changedById: testUser.id,
    },
  });

  // NDA 5 - Commercial sector, inactive
  const nda5 = await prisma.nda.create({
    data: {
      companyName: 'Acme Technologies LLC',
      companyCity: 'San Francisco',
      companyState: 'CA',
      stateOfIncorporation: 'California',
      agencyGroupId: commAgencyGroup?.id || dodAgencyGroup.id,
      abbreviatedName: 'ACME-COMM',
      authorizedPurpose: 'Enterprise software partnership discussion',
      effectiveDate: sixtyDaysAgo,
      usMaxPosition: 'OTHER',
      isNonUsMax: true,
      status: 'INACTIVE_CANCELED',
      opportunityPocId: adminUser.id,
      relationshipPocId: adminUser.id,
      createdById: adminUser.id,
      createdAt: sixtyDaysAgo,
    },
  });

  await prisma.ndaStatusHistory.createMany({
    data: [
      { ndaId: nda5.id, status: 'CREATED', changedAt: sixtyDaysAgo, changedById: adminUser.id },
      { ndaId: nda5.id, status: 'INACTIVE_CANCELED', changedAt: thirtyDaysAgo, changedById: adminUser.id },
    ],
  });

  // Create subscriptions for POCs
  await prisma.ndaSubscription.createMany({
    data: [
      { ndaId: nda1.id, contactId: adminUser.id },
      { ndaId: nda1.id, contactId: testUser.id },
      { ndaId: nda2.id, contactId: testUser.id },
      { ndaId: nda3.id, contactId: adminUser.id },
      { ndaId: nda4.id, contactId: testUser.id },
    ].concat(sarah ? [
      { ndaId: nda1.id, contactId: sarah.id },
      { ndaId: nda3.id, contactId: sarah.id },
    ] : []),
  });

  console.log('  Created 5 sample NDAs with status history, documents, and subscriptions');
}

// =============================================================================
// MAIN
// =============================================================================

async function main() {
  console.log('Starting database seed...\n');

  await seedPermissions();
  await seedRoles();
  await seedAgencyStructure();
  await seedDevUsers();
  await seedRtfTemplates();
  await seedSystemConfig();
  await seedNdas();

  console.log('\n✅ Seed completed successfully!');
  console.log('\n📊 Demo Data Summary:');
  console.log('   - 11 Permissions (7 NDA + 4 Admin)');
  console.log('   - 4 Roles (Admin, NDA User, Limited User, Read-Only)');
  console.log('   - 4 Agency Groups with 15 Subagencies');
  console.log('   - 8 Internal Users + 3 External Contacts');
  console.log('   - 5 Sample NDAs (across all statuses)');
  console.log('   - 7 Documents (Generated, Uploaded, Fully Executed)');
  console.log('   - 1 Email record');
  console.log('   - 2 RTF Templates');
  console.log('   - 6 System Configuration entries');
  console.log('   - Multiple NDA subscriptions\n');
  console.log('🔑 Login credentials:');
  console.log('   - admin@usmax.com (Admin role - full access)');
  console.log('   - test@usmax.com (NDA User - DoD only)');
  console.log('   - sarah.johnson@usmax.com (NDA User - DoD & Federal)');
  console.log('   - mike.davis@usmax.com (Limited User - Commercial)');
  console.log('   - emily.chen@usmax.com (Read-Only - DoD)\n');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
