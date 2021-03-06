import { Store } from "ractor"
import { getByCache, Todos } from "../apis/cache"

import { InitTodos } from "../messages/InitTodos"
import { ChangeDisplay } from "../messages/ChangeDisplay"
import { AddTodo } from "../messages/AddTodo"
import { ToggleToto } from "../messages/ToggleTodo"
import { DestroyTodo } from "../messages/DestroyTodo"
import { ClearCompleted } from "../messages/ClearCompleted"

export type TodoState = Todos

export class TodoStore extends Store<Todos> {
	public state: Todos = {
		todos: [],
		display: "all"
	}

	public loggerListener = (obj: object) => {
		const date = new Date()
		console.log(`${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}:`, obj)
	}

	public preStart() {
		// 自定义一个打印日志的功能
		// store 启动的时候监听系统事件中心
		this.context.system.eventStream.on("*", this.loggerListener)
	}

	public postStop() {
		// store 停止的时候记得注销监听，防止内存泄露
		this.context.system.eventStream.off("*", this.loggerListener)
	}

	// postError 可以 catch 住你的 Behavior 里的错误信息
	public postError(err: Error) {
		// 可以重启
		// this.context.scheduler!.restart()
		// 也可以停止
		this.context.stop()
	}
	public createReceive() {
		return this.receiveBuilder()
			// 初始化
			.match(InitTodos, async () => {
				const todos = await getByCache()
				// 第一次初始化的时候有可能返回 null
				if (todos) {
					this.setState(todos)
				}
			})
			// 增加todo
			.match(AddTodo, addTodo => {
				const todos = [...this.state.todos, addTodo.todo]
				this.setState({ todos })
				localStorage.setItem("ractor-todo", JSON.stringify(this.state))
			})
			// 切换 todo 状态。active，completed
			.match(ToggleToto, toggleTodo => {
				const todos = [...this.state.todos]
				const todo = todos.find(todo => todo === toggleTodo.todo)!
				const todoStatus = todo.status === "active" ? "completed" : "active"
				todo.status = todoStatus
				this.setState({ todos })
				localStorage.setItem("ractor-todo", JSON.stringify(this.state))
			})
			// 切换要显示的 todos 状态。all， active， completed
			.match(ChangeDisplay, changeDisplay => {
				this.setState({ display: changeDisplay.display })
				localStorage.setItem("ractor-todo", JSON.stringify(this.state))
			})
			.match(DestroyTodo, destroyTodo => {
				const todos = [...this.state.todos]
				todos.splice(destroyTodo.todoIndex, 1)
				this.setState({ todos })
				localStorage.setItem("ractor-todo", JSON.stringify(this.state))
			})
			// 清楚已完成的todos
			.match(ClearCompleted, () => {
				const todos = this.state.todos.filter(todo => todo.status !== "completed")
				this.setState({ todos })
				localStorage.setItem("ractor-todo", JSON.stringify(this.state))
			})
			.build()
	}
}