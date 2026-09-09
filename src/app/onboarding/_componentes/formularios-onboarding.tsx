"use client";

import { useActionState, useState } from "react";
import { Building2, LogIn } from "lucide-react";
import {
  criarEscritorio,
  entrarEscritorio,
  type EstadoOnboarding,
} from "@/app/onboarding/actions";

type Aba = "criar" | "entrar";

export function FormulariosOnboarding() {
  const [aba, setAba] = useState<Aba>("criar");

  return (
    <div>
      <div className="flex gap-1 rounded-[var(--radius)] bg-raised p-1">
        <BotaoAba
          ativa={aba === "criar"}
          onClick={() => setAba("criar")}
          Icone={Building2}
          rotulo="Criar escritório"
        />
        <BotaoAba
          ativa={aba === "entrar"}
          onClick={() => setAba("entrar")}
          Icone={LogIn}
          rotulo="Entrar com código"
        />
      </div>

      <div className="mt-4">
        {aba === "criar" ? <FormCriar /> : <FormEntrar />}
      </div>
    </div>
  );
}

function BotaoAba({
  ativa,
  onClick,
  Icone,
  rotulo,
}: {
  ativa: boolean;
  onClick: () => void;
  Icone: typeof Building2;
  rotulo: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm font-medium transition-colors ${
        ativa
          ? "bg-surface-active text-foreground"
          : "text-fg-secondary hover:text-foreground"
      }`}
    >
      <Icone className="h-4 w-4" />
      {rotulo}
    </button>
  );
}

function FormCriar() {
  const [estado, acao, pendente] = useActionState<EstadoOnboarding, FormData>(
    criarEscritorio,
    undefined,
  );

  return (
    <form action={acao} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="nome" className="rotulo block">
          Nome do escritório
        </label>
        <input
          id="nome"
          name="nome"
          type="text"
          required
          maxLength={60}
          autoComplete="organization"
          placeholder="Ex.: Imobiliária Silva"
          className="campo"
        />
        <p className="text-xs text-fg-tertiary">
          Você vira o chefe e recebe um código pra convidar a equipe.
        </p>
      </div>

      {estado?.erro && <p className="text-sm text-danger">{estado.erro}</p>}

      <button
        type="submit"
        disabled={pendente}
        className="btn btn-primary w-full"
      >
        {pendente ? "Criando…" : "Criar escritório"}
      </button>
    </form>
  );
}

function FormEntrar() {
  const [estado, acao, pendente] = useActionState<EstadoOnboarding, FormData>(
    entrarEscritorio,
    undefined,
  );

  return (
    <form action={acao} className="space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="codigo" className="rotulo block">
          Código do escritório
        </label>
        <input
          id="codigo"
          name="codigo"
          type="text"
          required
          maxLength={12}
          autoCapitalize="characters"
          autoComplete="off"
          placeholder="Ex.: K7F3Q2"
          className="campo font-mono uppercase tracking-widest"
        />
        <p className="text-xs text-fg-tertiary">
          Peça o código pra quem já usa o sistema na sua empresa.
        </p>
      </div>

      {estado?.erro && <p className="text-sm text-danger">{estado.erro}</p>}

      <button
        type="submit"
        disabled={pendente}
        className="btn btn-primary w-full"
      >
        {pendente ? "Entrando…" : "Entrar no escritório"}
      </button>
    </form>
  );
}
