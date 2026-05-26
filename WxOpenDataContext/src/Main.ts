const { regClass } = Laya;

/**
 * 开放域运行时使用 Layout 方案，见 scripts/openDataContext/。
 * 本 Scene 仅用于 IDE 中编辑 prefab 与设计资源。
 */
@regClass()
export default class Main extends Laya.Script {
    onAwake(): void {
        // no-op
    }
}
