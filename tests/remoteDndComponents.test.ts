import {
  afterEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest'

import {
  INTERNAL_DND_CONTAINER_PROP,
  INTERNAL_DND_HANDLE_PROP,
  INTERNAL_DND_ITEM_PROP,
} from '@/vue/dnd'
import {
  RemoteDragHandle,
  RemoteSortableContainer,
  RemoteSortableItem,
} from '@/vue/remote'

const createContext = () => ({
  attrs: { id: 'fixture' },
  emit: vi.fn(),
  expose: vi.fn(),
  slots: {
    default: () => ['content'],
  },
})

describe('remoteDndComponents', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  test('encodes sortable container bindings into the rendered vnode', () => {
    const render = (RemoteSortableContainer as unknown as {
      setup: (props: Record<string, unknown>, context: ReturnType<typeof createContext>) => () => {
        props: Record<string, unknown>;
        type: string;
      };
    }).setup({
      accepts: ['task'],
      as: 'section',
      containerId: 'tasks',
      disabled: true,
      onDragenter: vi.fn(),
      onDragleave: vi.fn(),
      onDragmove: vi.fn(),
      onDrop: vi.fn(),
      orientation: 'horizontal',
    }, createContext())
    const vnode = render()

    expect(vnode.type).toBe('section')
    expect(vnode.props).toMatchObject({
      id: 'fixture',
      [INTERNAL_DND_CONTAINER_PROP]: {
        accepts: ['task'],
        containerId: 'tasks',
        disabled: true,
        orientation: 'horizontal',
      },
    })
  })

  test('encodes sortable item bindings into the rendered vnode', () => {
    const onDragstart = vi.fn()
    const onDragend = vi.fn()
    const onDragcancel = vi.fn()
    const render = (RemoteSortableItem as unknown as {
      setup: (props: Record<string, unknown>, context: ReturnType<typeof createContext>) => () => {
        props: Record<string, unknown>;
        type: string;
      };
    }).setup({
      as: 'article',
      containerId: 'tasks',
      disabled: false,
      index: 2,
      itemId: 'task-3',
      onDragcancel,
      onDragend,
      onDragstart,
      payload: { taskId: 'task-3' },
      type: 'task',
    }, createContext())
    const vnode = render()

    expect(vnode.type).toBe('article')
    expect(vnode.props).toMatchObject({
      id: 'fixture',
      [INTERNAL_DND_ITEM_PROP]: {
        containerId: 'tasks',
        disabled: false,
        index: 2,
        itemId: 'task-3',
        onDragcancel,
        onDragend,
        onDragstart,
        payload: { taskId: 'task-3' },
        type: 'task',
      },
    })
  })

  test('encodes drag handle bindings into the rendered vnode', () => {
    const render = (RemoteDragHandle as unknown as {
      setup: (props: Record<string, unknown>, context: ReturnType<typeof createContext>) => () => {
        props: Record<string, unknown>;
        type: string;
      };
    }).setup({
      as: 'button',
      disabled: true,
      for: 'task-1',
    }, createContext())
    const vnode = render()

    expect(vnode.type).toBe('button')
    expect(vnode.props).toMatchObject({
      id: 'fixture',
      [INTERNAL_DND_HANDLE_PROP]: {
        disabled: true,
        for: 'task-1',
      },
    })
  })
})
