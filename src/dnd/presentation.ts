interface DndOverlayPresentationAdapter {
  createOverlay (element: Element, clone: Element): Element;
  supports (element: Element, clone: Element): boolean;
}

const syncTableRowCloneCells = (sourceElement: HTMLTableRowElement, clone: HTMLTableRowElement) => {
  const sourceCells = [...sourceElement.cells]
  const cloneCells = [...clone.cells]

  sourceCells.forEach((sourceCell, index) => {
    const cloneCell = cloneCells[index]

    if (!(cloneCell instanceof HTMLElement)) {
      return
    }

    const width = sourceCell.getBoundingClientRect().width

    cloneCell.style.width = `${width}px`
    cloneCell.style.minWidth = `${width}px`
    cloneCell.style.maxWidth = `${width}px`
    cloneCell.style.boxSizing = 'border-box'
  })
}

const tableRowOverlayPresentationAdapter: DndOverlayPresentationAdapter = {
  supports (element, clone) {
    return element instanceof HTMLTableRowElement && clone instanceof HTMLTableRowElement
  },
  createOverlay (element, clone) {
    const table = document.createElement('table')
    const tbody = document.createElement('tbody')
    const sourceTable = element.closest('table')

    table.setAttribute('aria-hidden', 'true')
    table.style.width = '100%'
    table.style.tableLayout = 'fixed'

    if (sourceTable != null) {
      const computed = getComputedStyle(sourceTable)

      table.style.borderCollapse = computed.borderCollapse
      table.style.borderSpacing = computed.borderSpacing
    }

    syncTableRowCloneCells(element as HTMLTableRowElement, clone as HTMLTableRowElement)
    tbody.append(clone)
    table.append(tbody)

    return table
  },
}

const OVERLAY_PRESENTATION_ADAPTERS: DndOverlayPresentationAdapter[] = [
  tableRowOverlayPresentationAdapter,
]

export const createDndOverlayPresentation = (element: Element, clone: Element) => {
  const adapter = OVERLAY_PRESENTATION_ADAPTERS.find(candidate => candidate.supports(element, clone))

  return adapter?.createOverlay(element, clone) ?? clone
}
