import { Plugin } from 'vite'
import { parse } from '@babel/parser'
import MagicString from 'magic-string'
import path from 'path'

interface GhostmarkOptions {
  /**
   * Include component ID (file:line:column)
   * @default true
   */
  includeId?: boolean
  
  /**
   * Include component name
   * @default true
   */
  includeName?: boolean
  
  /**
   * Include component path
   * @default true
   */
  includePath?: boolean
  
  /**
   * Include line number
   * @default true
   */
  includeLine?: boolean
  
  /**
   * Include filename
   * @default true
   */
  includeFile?: boolean
  
  /**
   * Include component content/props
   * @default true
   */
  includeContent?: boolean

  /**
   * Custom tag prefix for data attributes
   * @default "gm"
   * @example "myapp" will generate data-myapp-id, data-myapp-path, etc.
   */
  tagPrefix?: string

  /**
   * File extensions to process
   * @default ['.jsx', '.tsx']
   */
  include?: string[]

  /**
   * Paths to exclude from processing
   * @default ['node_modules']
   */
  exclude?: string[]

  /**
   * Use relative paths in debug info
   * @default true
   */
  useRelativePath?: boolean

  /**
   * Enable debug logging
   * @default false
   */
  debug?: boolean

  /**
   * Filter out Three.js and Drei 3D elements
   * @default true
   */
  filter3DElements?: boolean
}

interface JSXLocation {
  line: number
  column: number
}

interface JSXNode {
  type: string
  name: {
    type: 'JSXIdentifier' | 'JSXMemberExpression'
    name?: string
    object?: { name: string }
    property?: { name: string }
    end: number
  }
  loc?: {
    start?: JSXLocation
  }
  attributes: JSXAttribute[]
  typeParameters?: {
    end: number
  }
}

interface JSXAttribute {
  type: string
  name?: { name: string }
  value?: {
    type: string
    value?: string
    expression?: {
      type: string
      value?: string
    }
  }
}

interface JSXChild {
  type: string
  value?: string
  expression?: {
    type: string
    value?: string
  }
}

interface JSXElement {
  type: string
  children?: JSXChild[]
}

interface ElementContent {
  text?: string
  placeholder?: string
  className?: string
}

interface ProcessingStats {
  totalFiles: number
  processedFiles: number
  totalElements: number
  skippedElements: number
}

// Three.js and Drei 3D elements to filter
const THREE_D_ELEMENTS = new Set([
  // Three.js primitives
  'mesh', 'group', 'scene', 'object3D',
  // Three.js geometries
  'geometry', 'bufferGeometry', 'boxGeometry', 'sphereGeometry', 
  'planeGeometry', 'cylinderGeometry', 'coneGeometry', 'torusGeometry',
  'circleGeometry', 'ringGeometry', 'tubeGeometry', 'extrudeGeometry',
  // Three.js materials
  'material', 'meshBasicMaterial', 'meshStandardMaterial', 
  'meshPhysicalMaterial', 'meshLambertMaterial', 'meshPhongMaterial',
  'shaderMaterial', 'lineBasicMaterial', 'pointsMaterial',
  // Three.js lights
  'ambientLight', 'directionalLight', 'pointLight', 'spotLight',
  'hemisphereLight', 'rectAreaLight',
  // Three.js cameras
  'perspectiveCamera', 'orthographicCamera',
  // Drei components
  'OrbitControls', 'PerspectiveCamera', 'OrthographicCamera',
  'Stars', 'Sky', 'Environment', 'ContactShadows', 'BakeShadows',
  'SoftShadows', 'AccumulativeShadows', 'RandomizedLight',
  'Box', 'Sphere', 'Plane', 'Cylinder', 'Cone', 'Torus', 'Circle',
  'Text', 'Text3D', 'MeshReflectorMaterial', 'MeshWobbleMaterial',
  'MeshDistortMaterial', 'Float', 'Stage', 'Lightformer',
  'SpotLight', 'PointLight', 'DirectionalLight', 'AmbientLight'
])

const isUpperCase = (char: string): boolean => 
  char === char.toUpperCase() && char !== char.toLowerCase()

const isCustomComponent = (elementName: string): boolean => {
  const firstChar = elementName.charAt(0)
  return isUpperCase(firstChar) || elementName.includes('.')
}

const is3DElement = (elementName: string): boolean => 
  THREE_D_ELEMENTS.has(elementName)

const extractElementName = (jsxNode: JSXNode): string | null => {
  if (jsxNode.name.type === 'JSXIdentifier') {
    return jsxNode.name.name ?? null
  } else if (jsxNode.name.type === 'JSXMemberExpression') {
    const object = jsxNode.name.object?.name ?? ''
    const property = jsxNode.name.property?.name ?? ''
    return `${object}.${property}`
  }
  return null
}

const extractElementAttributes = (attributes: JSXAttribute[]): Record<string, string> => {
  return attributes.reduce((acc, attr) => {
    if (attr.type !== 'JSXAttribute') return acc
    
    const attrName = attr.name?.name
    if (!attrName) return acc

    if (attr.value?.type === 'StringLiteral') {
      acc[attrName] = attr.value.value ?? ''
    } else if (
      attr.value?.type === 'JSXExpressionContainer' && 
      attr.value.expression?.type === 'StringLiteral'
    ) {
      acc[attrName] = attr.value.expression.value ?? ''
    }
    
    return acc
  }, {} as Record<string, string>)
}

const extractTextContent = (element: JSXElement | null): string => {
  if (!element?.children) return ''
  
  return element.children
    .map((child) => {
      if (child.type === 'JSXText') {
        return child.value?.trim() ?? ''
      } else if (child.type === 'JSXExpressionContainer') {
        if (child.expression?.type === 'StringLiteral') {
          return child.expression.value ?? ''
        }
      }
      return ''
    })
    .filter(Boolean)
    .join(' ')
    .trim()
}

const buildContentObject = (
  textContent: string,
  attributes: Record<string, string>
): ElementContent => {
  const content: ElementContent = {}
  
  if (textContent) {
    content.text = textContent
  }
  if (attributes.placeholder) {
    content.placeholder = attributes.placeholder
  }
  if (attributes.className) {
    content.className = attributes.className
  }
  
  return content
}

const buildDataAttributes = (
  options: Required<GhostmarkOptions>,
  data: {
    elementName: string
    filePath: string
    fileName: string
    line: number
    col: number
    content: ElementContent
  }
): string => {
  const { tagPrefix } = options
  const attributes: string[] = []
  
  if (options.includeId) {
    const componentId = `${data.filePath}:${data.line}:${data.col}`
    attributes.push(`data-${tagPrefix}-id="${componentId}"`)
  }
  
  if (options.includeName) {
    attributes.push(`data-${tagPrefix}-name="${data.elementName}"`)
  }
  
  if (options.includePath) {
    attributes.push(`data-${tagPrefix}-path="${data.filePath}"`)
  }
  
  if (options.includeLine) {
    attributes.push(`data-${tagPrefix}-line="${data.line}"`)
  }
  
  if (options.includeFile) {
    attributes.push(`data-${tagPrefix}-file="${data.fileName}"`)
  }
  
  if (options.includeContent && Object.keys(data.content).length > 0) {
    const encodedContent = encodeURIComponent(JSON.stringify(data.content))
    attributes.push(`data-${tagPrefix}-content="${encodedContent}"`)
  }
  
  return attributes.length > 0 ? ` ${attributes.join(' ')}` : ''
}

const getInsertPosition = (jsxNode: JSXNode): number => 
  jsxNode.typeParameters?.end ?? jsxNode.name.end ?? 0

const shouldSkipElement = (
  elementName: string | null,
  options: Required<GhostmarkOptions>
): boolean => {
  if (!elementName) return true
  
  // Skip fragments
  if (elementName === 'Fragment' || elementName === 'React.Fragment') {
    return true
  }

  // Skip 3D elements if filter is enabled
  if (options.filter3DElements && is3DElement(elementName)) {
    return true
  }
  
  return false
}

const shouldProcessFile = (
  filePath: string,
  options: Required<GhostmarkOptions>
): boolean => {
  const ext = path.extname(filePath)
  
  // Check if extension is included
  if (!options.include.includes(ext)) {
    return false
  }
  
  // Check if path should be excluded
  return !options.exclude.some(excludePath => filePath.includes(excludePath))
}

const logDebug = (message: string, debug: boolean) => {
  if (debug) {
    console.log(`[ghostmark] ${message}`)
  }
}

const ghostmark = (options: GhostmarkOptions = {}): Plugin => {
  const resolvedOptions: Required<GhostmarkOptions> = {
    includeId: options.includeId ?? true,
    includeName: options.includeName ?? true,
    includePath: options.includePath ?? true,
    includeLine: options.includeLine ?? true,
    includeFile: options.includeFile ?? true,
    includeContent: options.includeContent ?? true,
    tagPrefix: options.tagPrefix ?? 'gm',
    include: options.include ?? ['.jsx', '.tsx'],
    exclude: options.exclude ?? ['node_modules'],
    useRelativePath: options.useRelativePath ?? true,
    debug: options.debug ?? false,
    filter3DElements: options.filter3DElements ?? true
  }

  const cwd = process.cwd()
  const stats: ProcessingStats = {
    totalFiles: 0,
    processedFiles: 0,
    totalElements: 0,
    skippedElements: 0
  }

  if (resolvedOptions.debug) {
    console.log('[ghostmark] Configuration:', {
      tagPrefix: resolvedOptions.tagPrefix,
      include: resolvedOptions.include,
      exclude: resolvedOptions.exclude,
      useRelativePath: resolvedOptions.useRelativePath,
      filter3DElements: resolvedOptions.filter3DElements
    })
  }

  return {
    name: 'vite-plugin-ghostmark',
    enforce: 'pre',
    
    async transform(code: string, id: string) {
      // Check if file should be processed
      if (!shouldProcessFile(id, resolvedOptions)) {
        return null
      }

      stats.totalFiles++
      const filePath = resolvedOptions.useRelativePath ? path.relative(cwd, id) : id
      const fileName = path.basename(id)

      logDebug(`Processing file: ${filePath}`, resolvedOptions.debug)

      try {
        const ast = parse(code, {
          sourceType: 'module',
          plugins: ['jsx', 'typescript']
        })
        
        const magicString = new MagicString(code)
        let changedElementsCount = 0
        let currentElement: JSXElement | null = null

        const { walk } = await import('estree-walker')
        
        walk(ast as any, {
          enter(node: any) {
            if (node.type === 'JSXElement') {
              currentElement = node as JSXElement
            }
            
            if (node.type === 'JSXOpeningElement') {
              const jsxNode = node as JSXNode
              const elementName = extractElementName(jsxNode)
              
              if (shouldSkipElement(elementName, resolvedOptions)) {
                if (elementName) {
                  stats.skippedElements++
                  logDebug(`Skipped element: ${elementName}`, resolvedOptions.debug)
                }
                return
              }

              const elementAttributes = extractElementAttributes(jsxNode.attributes)
              const textContent = extractTextContent(currentElement)
              const content = buildContentObject(textContent, elementAttributes)

              const line = jsxNode.loc?.start?.line ?? 0
              const col = jsxNode.loc?.start?.column ?? 0
              
              const attributes = buildDataAttributes(resolvedOptions, {
                elementName: elementName!,
                filePath,
                fileName,
                line,
                col,
                content
              })
              
              if (attributes) {
                const insertPosition = getInsertPosition(jsxNode)
                magicString.appendLeft(insertPosition, attributes)
                changedElementsCount++
                logDebug(
                  `Tagged element: ${elementName} at ${filePath}:${line}:${col}`,
                  resolvedOptions.debug
                )
              }
            }
          }
        })

        stats.processedFiles++
        stats.totalElements += changedElementsCount

        if (resolvedOptions.debug && changedElementsCount > 0) {
          console.log(`[ghostmark] Processed ${filePath}: ${changedElementsCount} elements tagged`)
        }

        return {
          code: magicString.toString(),
          map: magicString.generateMap({ hires: true })
        }
      } catch (error) {
        console.error(`[ghostmark] Error processing file ${filePath}:`, error)
        stats.processedFiles++
        return null
      }
    },

    buildEnd() {
      if (resolvedOptions.debug) {
        console.log('[ghostmark] Build statistics:', {
          totalFiles: stats.totalFiles,
          processedFiles: stats.processedFiles,
          totalElements: stats.totalElements,
          skippedElements: stats.skippedElements
        })
      }
    }
  }
}

export { ghostmark }
export type { GhostmarkOptions }
export default ghostmark
