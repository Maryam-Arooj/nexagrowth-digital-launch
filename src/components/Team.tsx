import { motion } from "framer-motion";
import { Linkedin, Twitter } from "lucide-react";

const team = [
  { name: "Alex Rivera", role: "CEO & Strategist", initials: "AR" },
  { name: "Priya Sharma", role: "Head of SEO", initials: "PS" },
  { name: "James Mitchell", role: "Paid Media Director", initials: "JM" },
  { name: "Olivia Zhang", role: "Creative Lead", initials: "OZ" },
];

const Team = () => (
  <section id="team" className="py-24">
    <div className="container mx-auto px-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="text-center mb-16"
      >
        <span className="text-primary text-sm font-semibold uppercase tracking-widest">Our Team</span>
        <h2 className="font-heading text-3xl md:text-5xl font-bold mt-3">
          Meet the <span className="gradient-text">Experts</span>
        </h2>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
        {team.map((member, i) => (
          <motion.div
            key={member.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
            whileHover={{ y: -6 }}
            className="glass-card rounded-2xl p-6 text-center group cursor-default"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mx-auto mb-4">
              <span className="font-heading text-lg font-bold gradient-text">{member.initials}</span>
            </div>
            <h3 className="font-heading font-semibold">{member.name}</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">{member.role}</p>
            <div className="flex justify-center gap-3">
              <Linkedin size={16} className="text-muted-foreground hover:text-primary transition-colors cursor-pointer" />
              <Twitter size={16} className="text-muted-foreground hover:text-primary transition-colors cursor-pointer" />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  </section>
);

export default Team;
