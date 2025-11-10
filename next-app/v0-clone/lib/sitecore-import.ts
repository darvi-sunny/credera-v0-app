// lib/sitecoreTemplateCreator.ts (final: multiple sample items, title-case folders, sanitization)
/*
  - Creates templates, sections, fields, data-folder templates & items, renderings.
  - Creates multiple sample content items per data-folder using `sampleData`.
  - Data-folder item names converted to Title Case with spacing.
  - Sample item names sanitized to match Sitecore ItemNameValidation.
*/

import axios from 'axios'
import https from 'https'
import { json } from 'zod'

// -----------------------------
// Types
// -----------------------------
export interface Field {
  name: string
  type: string
  displayName: string
  sampleData?: string
}

export interface SitecoreTemplateDefinition {
  componentName: string
  nextJsComponentName: string
  fields: Field[]
  child?: SitecoreTemplateDefinition[]
  multiListSourceIds?: string[]
}

export interface CreationSummary {
  componentName: string
  templateId?: string
  renderingId?: string
  dataFolderId?: string
  createdFields: { name: string; id?: string }[]
  childSummaries?: CreationSummary[]
  dataSourceItemId?: string
}

// -----------------------------
// Config
// -----------------------------
const SKIP_TLS_VERIFY = process.env.SKIP_TLS_VERIFY === 'true'
const httpsAgent = SKIP_TLS_VERIFY
  ? new https.Agent({ rejectUnauthorized: false })
  : undefined

const SITECORE_AUTHORING_API_GRAPHQL_ENDPOINT =
  process.env.SITECORE_AUTHORING_API_GRAPHQL_ENDPOINT
const SITECORE_AUTHORING_API_TOKEN = process.env.SITECORE_AUTHORING_API_TOKEN

if (!SITECORE_AUTHORING_API_TOKEN || !SITECORE_AUTHORING_API_GRAPHQL_ENDPOINT) {
  throw new Error(
    'Missing required environment variables SITECORE_AUTHORING_API_TOKEN or SITECORE_AUTHORING_API_GRAPHQL_ENDPOINT',
  )
}

const CREATE_ITEM_MUTATION = `
mutation CreateItem($input: CreateItemInput!) {
  createItem(input: $input) {
    item { itemId name path }
  }
}`

const IDS = {
  TEMPLATE_PARENT_ID: process.env.TEMPLATE_PARENT_ID as string,
  RENDERING_PARENT_ID: process.env.RENDERING_PARENT_ID as string,
  DATA_FOLDER_PARENT_ID: process.env.DATA_FOLDER_PARENT_ID as string,

  TEMPLATE_TEMPLATE_ID: '{AB86861A-6030-46C5-B394-E8F99E8B87DB}',
  SECTION_TEMPLATE_ID: '{E269FBB5-3750-427A-9149-7AA950B49301}',
  FIELD_TEMPLATE_ID: '{455A3E98-A627-4B40-8035-E683A0331AC7}',
  RENDERING_TEMPLATE_ID: '{04646A89-996F-4EE7-878A-FFDBF1F0EF0D}',
  TEMPLATE_FOLDER_ID: '{0437FEE2-44C9-46A6-ABE9-28858D9FEE8C}',
  PAGE_SAMPLE_DATA_PARENT_ID: process.env.PAGE_SAMPLE_DATA_PARENT_ID as string,
  PAGE_SAMPLE_DATA_ITEM_TEMPLATE_ID: process.env.PAGE_SAMPLE_DATA_ITEM_TEMPLATE_ID as string,
}

// How many sample items to create per data-folder (configurable)
const SAMPLE_ITEM_COUNT = 3
const PARENT_SAMPLE_ITEM_COUNT = 1
let pageData: {
  componentName: string
  templateId: string | undefined
  renderingId: string | undefined
  dataFolderId: string | undefined
  dataSourceItemId: string | undefined
}[] = []

// -----------------------------
// Utility helpers
// -----------------------------
function formatGuid(input: string): string {
  // Remove all non-alphanumeric characters
  const clean = input.replace(/[^a-fA-F0-9]/g, '').toUpperCase()

  if (clean.length !== 32) {
    throw new Error(
      `Invalid GUID format: expected 32 hex characters, got ${clean.length}`,
    )
  }

  // Split and format into standard GUID pattern: 8-4-4-4-12
  const formatted = [
    clean.substring(0, 8),
    clean.substring(8, 12),
    clean.substring(12, 16),
    clean.substring(16, 20),
    clean.substring(20, 32),
  ].join('-')

  return `{${formatted}}`
}

function mapFieldsToFieldItems(
  fields: Field[],
): { itemName: string; fields: { name: string; value: string }[] }[] {
  return fields.map((f) => ({
    itemName: f.name,
    fields: [
      { name: 'Type', value: f.type },
      { name: 'Title', value: f.displayName },
    ],
  }))
}

function toTitleCaseWithSpacing(input: string) {
  if (!input) return input
  // Replace underscores/hyphens with spaces
  let s = input.replace(/[_-]+/g, ' ')
  // Insert spaces before camel case capitals: e.g. FooterLink -> Footer Link
  s = s.replace(/([a-z])([A-Z])/g, '$1 $2')
  // Collapse multiple spaces
  s = s.replace(/\s+/g, ' ').trim()
  // Title case words
  s = s
    .split(' ')
    .map((w) => (w.length ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(' ')
  return s
}

/**
 * Sanitize an item name so it matches Sitecore's ItemNameValidation:
 * ^[\w\*\$][\w\s\-\$]*(\(\d{1,}\)){0,1}$
 *
 * - Remove disallowed chars, collapse spaces
 * - Allow a single trailing numeric suffix (1), (2), ...
 * - Ensure first character is valid; else prefix with 'Item '
 */
function sanitizeItemNameForSitecore(raw: string): string {
  if (!raw) return 'Item'

  let s = raw.trim()

  // Remove disallowed characters (keep letters, digits, underscore, space, hyphen, $, *, parentheses)
  s = s.replace(/[^A-Za-z0-9_\s\-\$\*\(\)]/g, '')
  s = s.replace(/\s+/g, ' ').trim()

  // Allow only a single trailing parentheses group if numeric, e.g., (1)
  const trailingParenMatch = s.match(/\((\d+)\)\s*$/)
  s = s.replace(/\([^)]*\)/g, '').trim()
  if (trailingParenMatch) {
    s = `${s}(${trailingParenMatch[1]})`
  }

  // Ensure first character is allowed [A-Za-z0-9_*$]
  if (!s.charAt(0).match(/[A-Za-z0-9_\*\$]/)) {
    s = `Item ${s}`
  }

  if (!s) s = 'Item'
  if (s.length > 100) s = s.substring(0, 100).trim()
  return s
}

// Build content-fields payload for a content item from fields' sampleData
function buildContentFieldsFromSample(fields: Field[]) {
  const out: { name: string; value: string }[] = []
  for (const f of fields) {
    if (typeof f.sampleData === 'string' && f.sampleData.trim() !== '') {
      out.push({ name: f.name, value: f.sampleData })
    }
  }
  return out
}

// -----------------------------
// GraphQL helper
// -----------------------------
async function sendGraphQL(query: string, variables: any) {
  const payload = { query, variables }
  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${SITECORE_AUTHORING_API_TOKEN}`,
  }

  const resp = await axios.post(
    SITECORE_AUTHORING_API_GRAPHQL_ENDPOINT || '',
    payload,
    {
      headers,
      ...(httpsAgent ? { httpsAgent } : {}),
      timeout: 30000,
    },
  )

  if (resp.status < 200 || resp.status >= 300)
    throw new Error(`HTTP ${resp.status}`)
  if (resp.data?.errors?.length)
    throw new Error(`GraphQL errors: ${JSON.stringify(resp.data.errors)}`)
  return resp.data
}

function extractCreatedItem(responseJson: any) {
  const data = responseJson?.data
  const rootKey = Object.keys(data || {})[0]
  const root = data[rootKey]
  if (!root)
    throw new Error(`Invalid GraphQL response: ${JSON.stringify(responseJson)}`)
  return root.item
}

// -----------------------------
// Primitive creators
// -----------------------------
async function createItem(vars: any) {
  const resp = await sendGraphQL(CREATE_ITEM_MUTATION, vars)
  return extractCreatedItem(resp)
}

async function createTemplate(
  parentId: string,
  name: string,
  templateTemplateId = IDS.TEMPLATE_TEMPLATE_ID,
) {
  const vars = {
    input: {
      database: 'master',
      language: 'en',
      name,
      parent: parentId,
      templateId: templateTemplateId,
      fields: [],
    },
  }
  return createItem(vars)
}

async function createSection(parentId: string, name = 'Data') {
  const vars = {
    input: {
      database: 'master',
      language: 'en',
      name,
      parent: parentId,
      templateId: IDS.SECTION_TEMPLATE_ID,
      fields: [],
    },
  }
  return createItem(vars)
}

async function createField(
  parentId: string,
  field: { itemName: string; fields: { name: string; value: string }[] },
) {
  const vars = {
    input: {
      database: 'master',
      language: 'en',
      name: field.itemName,
      parent: parentId,
      templateId: IDS.FIELD_TEMPLATE_ID,
      fields: field.fields,
    },
  }
  return createItem(vars)
}

async function createDataFolderTemplate(parentId: string, name: string) {
  const vars = {
    input: {
      database: 'master',
      language: 'en',
      name,
      parent: parentId,
      templateId: IDS.TEMPLATE_TEMPLATE_ID,
      fields: [],
    },
  }
  return createItem(vars)
}

async function createDataFolderItem(
  parentId: string,
  name: string,
  templateId: string,
  mastersId?: string,
) {
  const fields = mastersId ? [{ name: '__Masters', value: mastersId }] : []
  const vars = {
    input: {
      database: 'master',
      language: 'en',
      name,
      parent: parentId,
      templateId,
      fields,
    },
  }
  return createItem(vars)
}

async function createRendering(
  parentId: string,
  name: string,
  nextJsComponentName: string,
  dataSourceTemplate: string = '',
) {
  const vars = {
    input: {
      database: 'master',
      language: 'en',
      name,
      parent: parentId,
      templateId: IDS.RENDERING_TEMPLATE_ID,
      fields: [
        { name: 'componentName', value: nextJsComponentName },
        {
          name: 'Rendering Contents Resolver',
          value: '{3DF775BF-3F56-446F-9D81-43DE64DA4DDA}',
        },
        { name: 'Datasource Template', value: dataSourceTemplate },
      ],
    },
  }
  return createItem(vars)
}

// Create a content item under a data folder using given template id and field values
async function createContentItem(
  parentId: string,
  name: string,
  templateId: string,
  fieldValues: { name: string; value: string }[],
) {
  const vars = {
    input: {
      database: 'master',
      language: 'en',
      name,
      parent: parentId,
      templateId,
      fields: fieldValues,
    },
  }
  return createItem(vars)
}

// -----------------------------
// High-level flow (sequential)
// -----------------------------
export async function createFromJson(
  templates: SitecoreTemplateDefinition[],
): Promise<CreationSummary[]> {
  if (!Array.isArray(templates))
    throw new Error('Input must be an array of templates')
  for (const t of templates) t.multiListSourceIds = t.multiListSourceIds || []

  const summaries: CreationSummary[] = []

  for (const tpl of templates) {
    const summary = await createOneTemplateFlow(tpl)
    summaries.push(summary)
    
    // Collect page data info fo final push into page data item
    pageData.push({
      componentName: summary.componentName,
      templateId: summary.templateId,
      renderingId: summary.renderingId,
      dataFolderId: summary.dataFolderId,
      dataSourceItemId: summary.dataSourceItemId,
    })
  }
  // Create page data item under /sitecore/system/Settings/Project/Figma Integration
    
  const pageDataItem = await createContentItem(
    IDS.PAGE_SAMPLE_DATA_PARENT_ID,
    'Page Data',
    IDS.PAGE_SAMPLE_DATA_ITEM_TEMPLATE_ID,
    [
      { name: 'Page Name', value: 'Figma To Sitecore Demo' },
      {
        name: 'Page Template',
        value: '{807349B6-97BB-4A7A-B356-3900EBF2A629}',
      },
      { name: 'Components', value: `${JSON.stringify(pageData)}` },
    ],
  ) 
  return summaries
}

// createChildren accepts parent folder ids (always provided by createOneTemplateFlow)
async function createChildren(
  tpl: SitecoreTemplateDefinition,
  parentTemplateParentId: string,
  parentRenderingFolderId: string,
  parentDataFolderParentId: string,
) {
  // parentTemplateParentId is the folder under which child templates reside
  for (const child of tpl.child || []) {
    // create child template + section
    const childTemplate = await createTemplate(
      parentTemplateParentId,
      child.componentName,
      IDS.TEMPLATE_TEMPLATE_ID,
    )
    const childSection = await createSection(childTemplate.itemId, 'Data')

    // fields
    const fieldItems = mapFieldsToFieldItems(child.fields)
    for (const fi of fieldItems) {
      await createField(childSection.itemId, fi)
    }

    // data folder template + item for child
    const childDataFolderTemplate = await createDataFolderTemplate(
      parentTemplateParentId,
      `${child.componentName} Data Folder`,
    )

    // Title-case & spacing for data folder item name
    const dataFolderName = toTitleCaseWithSpacing(child.componentName)
    const childDataFolderItem = await createDataFolderItem(
      parentDataFolderParentId,
      dataFolderName,
      childDataFolderTemplate.itemId,
      childTemplate.itemId,
    )

    // collect multilist source id
    tpl.multiListSourceIds!.push(childDataFolderItem.itemId)

    // create child rendering under the provided parentRenderingFolderId
    await createRendering(
      parentRenderingFolderId,
      child.componentName,
      child.nextJsComponentName,
      childTemplate.path,
    )
    // Create sample content items for this child if sampleData exists
    const sampleFields = buildContentFieldsFromSample(child.fields)
    if (sampleFields.length > 0) {
      // choose a sample item base name: prefer a 'title' or 'name' field value, otherwise use component + ' Sample'
      const titleField = child.fields.find(
        (f) =>
          f.name.toLowerCase() === 'title' || f.name.toLowerCase() === 'name',
      )
      const baseName =
        titleField && titleField.sampleData && titleField.sampleData.trim()
          ? titleField.sampleData
          : `${toTitleCaseWithSpacing(child.componentName)} Sample`

      // create multiple items with sequential suffixes
      for (let i = 0; i < SAMPLE_ITEM_COUNT; i++) {
        const numbered = `${baseName} ${i + 1}`
        const sanitized = sanitizeItemNameForSitecore(numbered)
        await createContentItem(
          childDataFolderItem.itemId,
          sanitized,
          childTemplate.itemId,
          sampleFields,
        )
      }
    }
  }

  return parentTemplateParentId
}

async function createOneTemplateFlow(
  tpl: SitecoreTemplateDefinition,
): Promise<CreationSummary> {
  const templateName = tpl.componentName
  const sectionName = 'Data'

  let parentTemplateParentId = IDS.TEMPLATE_PARENT_ID // default templates parent
  let parentRenderingParentId = IDS.RENDERING_PARENT_ID // default renderings parent
  let parentDataFolderParentId = IDS.DATA_FOLDER_PARENT_ID // default data folder parent

  // If tpl has children, create the parent folders here (once) and pass to createChildren
  let parentTemplateFolderId: string | null = null
  let parentRenderingFolderId: string | null = null
  if (tpl.child && tpl.child.length > 0) {
    const parentFolder = await createTemplate(
      parentTemplateParentId,
      tpl.componentName,
      IDS.TEMPLATE_FOLDER_ID,
    )
    parentTemplateFolderId = parentFolder.itemId

    const renderingFolder = await createTemplate(
      parentRenderingParentId,
      tpl.componentName,
      IDS.TEMPLATE_FOLDER_ID,
    )
    parentRenderingFolderId = renderingFolder.itemId

    // create children under these pre-created folders
    parentTemplateParentId = await createChildren(
      tpl,
      parentTemplateFolderId ?? '',
      parentRenderingFolderId ?? '',
      parentDataFolderParentId,
    )
  }

  // Create main template (under either newly created folder or default parent)
  const mainTemplate = await createTemplate(
    parentTemplateParentId,
    templateName,
    IDS.TEMPLATE_TEMPLATE_ID,
  )
  const mainSection = await createSection(mainTemplate.itemId, sectionName)

  // Create fields for main template (attach Multilist Source from collected ids)
  const fieldItems = mapFieldsToFieldItems(tpl.fields)
  let multiSourceCntr = 0
  for (const fi of fieldItems) {
    const typeField = fi.fields.find((f) => f.name === 'Type')
    if (typeField && typeField.value.toLowerCase() === 'multilist') {
      fi.fields.push({
        name: 'Source',
        value:
          formatGuid(tpl.multiListSourceIds?.[multiSourceCntr] ?? '') ?? '',
      })
      multiSourceCntr++
    }
    await createField(mainSection.itemId, fi)
  }

  // Create data folder template + item for parent
  const parentTemplateDataFolder = await createDataFolderTemplate(
    parentTemplateParentId,
    `${tpl.componentName} Data Folder`,
  )

  // Title-case & spacing for parent data folder name
  const parentDataFolderName = toTitleCaseWithSpacing(tpl.componentName)
  const parentTemplateDataFolderItem = await createDataFolderItem(
    parentDataFolderParentId,
    parentDataFolderName,
    parentTemplateDataFolder.itemId,
    mainTemplate.itemId,
  )

  // Create multiple sample content items for parent template if sampleData exists
  const parentSampleFields = buildContentFieldsFromSample(tpl.fields)
  let parentContentItem: any = {}
  if (parentSampleFields.length > 0) {
    const titleField = tpl.fields.find(
      (f) =>
        f.name.toLowerCase() === 'title' || f.name.toLowerCase() === 'name',
    )
    const baseName =
      titleField && titleField.sampleData && titleField.sampleData.trim()
        ? titleField.sampleData
        : `${toTitleCaseWithSpacing(tpl.componentName)} Sample`
    //for (let i = 0; i < PARENT_SAMPLE_ITEM_COUNT; i++) {
    // const numbered = `${baseName} ${i + 1}`
    const numbered = `${baseName}`
    const sanitized = sanitizeItemNameForSitecore(numbered)
    parentContentItem = await createContentItem(
      parentTemplateDataFolderItem.itemId,
      sanitized,
      mainTemplate.itemId,
      parentSampleFields,
    )
    // }
  }

  // Create parent rendering under the renderings root (or folder)
  const parentRendering = await createRendering(
    parentRenderingFolderId ?? parentRenderingParentId,
    tpl.componentName,
    tpl.nextJsComponentName,
    mainTemplate.path,
  )

  const createdFields = tpl.fields.map((f) => ({ name: f.name }))
  const childSummaries = (tpl.child || []).map((c) => ({
    componentName: c.componentName,
    createdFields: [],
  }))

  return {
    componentName: tpl.componentName,
    templateId: mainTemplate.itemId,
    renderingId: parentRendering.itemId,
    dataFolderId: parentTemplateDataFolderItem.itemId,
    createdFields,
    childSummaries,
    dataSourceItemId: parentContentItem.itemId,
  }
}
