export default function ServiceCard({ title, desc, icon }: { title: string; desc: string; icon?: string }) {
  return (
    <article className="bg-white rounded-2xl shadow-sm border border-green-100 p-6 hover:shadow-md transition group">
      <div className="flex items-start gap-4">
        {icon && <span className="text-3xl" aria-hidden="true">{icon}</span>}
        <div>
          <h3 className="font-serif text-lg text-forest mb-2 group-hover:underline">{title}</h3>
          <p className="text-gray-600 text-sm leading-relaxed">{desc}</p>
        </div>
      </div>
    </article>
  );
}
