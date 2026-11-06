// Textos padrão dos documentos de adoção (editáveis em Configurações > Adoção).
// {{ong}} é substituído pelo nome da ONG.
import type { OrgSettings } from './types'

export const DEFAULT_ADOPTION_TERM = `Ao adotar um animal é OBRIGATÓRIO castrá-lo. A castração é de total responsabilidade do adotante. No caso de filhotes, a castração deve ser feita com 6/7 meses de idade. A castração, além de evitar a procriação em fêmeas, evita câncer de mama e de útero. E nos machos, evita câncer de testículos.
OBS.: O adotante deverá guardar este TERMO como documento do animal, para comprovação da adoção.`

export const DEFAULT_ADOPTION_DECLARATION = `Declaro-me ciente e de acordo com as normas de adoção, responsabilizo-me a cuidar do meu animal após a adoção. ASSUMO a responsabilidade financeira para o cuidado e tratamento médico veterinário caso seja necessário, eximindo a {{ong}} de quaisquer custos a partir desta data. Abandonar ou maltratar animais é crime (Lei Federal 9.605/98).`

export const DEFAULT_REQUIREMENTS_CAT = `Apartamento telado ou casa com muros e portões altos (sem acesso à rua)`

export const DEFAULT_REQUIREMENTS_DOG = `Foto ou vídeo do local onde o animal vai morar
Casa murada, com portão, onde o animal não possa fugir ou ser atropelado
Comprovante de residência
Documento com foto (de preferência CNH)
Filhotes devem ser castrados aos 6 meses`

export const DEFAULT_RESPONSIBILITIES = `Se mora de aluguel, converse com o proprietário antes e, caso mude, verifique se são permitidos animais — não há como descartar um animal, ele faz parte da sua família.
Filhotes querem brincar e descobrir o mundo: muitas vezes estragam coisas e choram, pois sentem falta dos pais e estão aprendendo as regras da casa. Se não estiver disposto a passar por isso, adote um animal adulto.
Ao adotar um filhote nunca saberemos ao certo o tamanho que ele terá: você está adotando o animal, independentemente do tamanho.
Os animais precisam de potes limpos, água limpa, boa alimentação e lugares quentinhos, longe da chuva e do vento.
Precisam ser castrados e a ONG não consegue castrar todos, então você assumirá a castração do animal adotado.
Todo animal precisa ir ao veterinário, ter a carteirinha de vacinação em dia e vermífugos regularmente — e tudo isso tem custo.
Animal não é brinquedo nem objeto para ser descartado (gravidez, alergia, mudança etc.). Ele é sua responsabilidade até "morrer de velhice": gatos vivem em média até 18 anos e cães 15 anos ou mais.
Mudança, nascimento de filho, divórcio, namoro ou casamento são as desculpas mais comuns para o abandono. Toda a família deve estar de acordo antes da adoção e assumir a responsabilidade.
Não use o animal apenas para segurança de sítio ou empresa: ele precisa de amor, atenção, brincadeira e conforto, como nós.
Jamais deixe cães e gatos darem "voltinhas" sozinhos: correm risco de atropelamento, doenças e envenenamento, e você será responsabilizado.
A adaptação ao novo lar pode levar dias, semanas ou meses. O animal precisa de atenção, cuidado, tempo e afeto; devolução após alguns dias não será aceita, pois você foi devidamente informado.
Doenças podem estar incubadas e aparecer nas semanas seguintes; a partir da adoção o animal é sua responsabilidade e deverá ser consultado por um médico veterinário.
Animais especiais (sequelas de doenças ou doenças persistentes) exigem cuidados redobrados; o tratamento indicado pela veterinária da ONG será feito pelo adotante com o médico de sua confiança.
A {{ong}} poderá fazer visitas, ligar ou pedir vídeos dos animais adotados para acompanhar o seu bem-estar.`

export const DEFAULT_SETTINGS: Required<OrgSettings> = {
  foodDailyKg: { dog: 0, cat: 0 },
  castrationMonths: 6,
  castrationDaysAdult: 30,
  adoptionTerm: DEFAULT_ADOPTION_TERM,
  adoptionDeclaration: DEFAULT_ADOPTION_DECLARATION,
  adopterResponsibilities: DEFAULT_RESPONSIBILITIES,
  requirementsDog: DEFAULT_REQUIREMENTS_DOG,
  requirementsCat: DEFAULT_REQUIREMENTS_CAT,
}

export function withDefaults(s: OrgSettings | null | undefined): Required<OrgSettings> {
  return {
    ...DEFAULT_SETTINGS,
    ...Object.fromEntries(Object.entries(s ?? {}).filter(([, v]) => v !== undefined && v !== '')),
    foodDailyKg: { ...DEFAULT_SETTINGS.foodDailyKg, ...(s?.foodDailyKg ?? {}) },
  } as Required<OrgSettings>
}

export function fillOrg(text: string, orgName: string) {
  return text.replaceAll('{{ong}}', orgName)
}

export function lines(text: string | null | undefined) {
  return (text ?? '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
}
