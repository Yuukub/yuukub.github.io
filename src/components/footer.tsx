export function Footer() {
    return (
        <footer className="border-t py-12 px-4 bg-background/95 backdrop-blur-sm relative z-20">
            <div className="container mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
                <div className="text-left">
                    <h4 className="font-bold text-lg mb-2 underline decoration-primary/30 underline-offset-4">Saranyuu M.</h4>
                    <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} สงวนลิขสิทธิ์ตามกฎหมาย</p>
                </div>
                <p className="text-xs text-muted-foreground max-w-xs md:text-right border-l md:border-l-0 md:border-r border-border/50 pl-4 md:pl-0 md:pr-4">
                    ความปลอดภัย. การตลาด. การพัฒนา. <br />
                    แนวทางด้านเทคนิคแบบรวมศูนย์เพื่อการเติบโตทางดิจิทัล
                </p>
            </div>
        </footer>
    );
}
