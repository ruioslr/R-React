import {Task} from "../type";

export function scheduleCallback(task: Task){
    task.callback();
}
