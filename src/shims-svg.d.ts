declare module '*.svg' {
    import type { DefineComponent } from 'vue'

    const component: DefineComponent<
        NonNullable<unknown>,
        NonNullable<unknown>,
        unknown
    >

    export default component
}
