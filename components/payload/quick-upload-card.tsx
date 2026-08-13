import Link from "next/link";
import { adminTasks } from "@/lib/admin-tasks";

export function QuickUploadCard() {
  return (
    <section className="admin-start">
      <div className="admin-start__heading">
        <span>Panel SHOWteam</span>
        <h1>Co chcesz zrobić?</h1>
        <p>Wybierz zadanie. Resztę panel przeprowadzi krok po kroku.</p>
      </div>
      <div className="admin-task-grid">
        {adminTasks.map((task, index) => <Link href={task.href} className="admin-task" key={task.href}>
          <span className="admin-task__number">{String(index + 1).padStart(2, "0")}</span>
          <strong>{task.title}</strong>
          <p>{task.description}</p>
          <span className="admin-task__action"><span>Otwórz</span> →</span>
        </Link>)}
      </div>
    </section>
  );
}
