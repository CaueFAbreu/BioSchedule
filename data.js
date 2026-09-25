/* Fonte: horário de Engenharia Biomédica, 2026/2. Cargas e requisitos: fluxograma EB2020 versão 12 fornecido pelo usuário. */
(function(root){
const slots=[['07:10','08:00'],['08:00','08:50'],['08:50','09:40'],['09:50','10:40'],['10:40','11:30'],['11:30','12:20'],['13:10','14:00'],['14:00','14:50'],['14:50','15:40'],['16:00','16:50'],['16:50','17:40'],['17:40','18:30'],['19:00','19:50'],['19:50','20:40'],['20:50','21:40'],['21:40','22:30']];
const courses=[];
const s=(day,...rows)=>rows.map(row=>({day,start:slots[row][0],end:slots[row][1]}));
const o=(id,...parts)=>({id,meetings:parts.flat()});
function c(period,id,short,name,sections=[],note='',offered=true){courses.push({period,id,short,name,sections,note,offered,hours:null,prerequisites:null});}
c(1,'FAMAT31011','C1','Cálculo Diferencial e Integral I',[o('2',s(0,0,1),s(1,0,1),s(2,0,1))]);
c(1,'FAMAT31021','GA','Geometria Analítica',[o('2',s(0,2,3),s(1,2,3))]);
c(1,'FEMEC39101','EXPG','Expressão Gráfica',[o('1',s(0,4,5),s(3,4,5))]);
c(1,'FEELT31107','PSC','Programação Script',[o('A1',s(2,4,5,6,7)),o('A2',s(2,4,5),s(3,6,7)),o('C1',s(4,2,3,4,5)),o('C2',s(4,2,3,6,7))]);
c(1,'FEELT31106','IEB','Introdução à Engenharia Biomédica',[o('B',s(2,2,3))]);
c(1,'FEELT31204','MTR','Metrologia',[o('A2',s(1,8,9),s(4,2,3)),o('A3',s(1,8,9),s(4,4,5)),o('B1',s(3,0,1),s(2,6,7)),o('B4',s(2,4,5,6,7))]);
c(1,'FEELT32102','EXT1','Extensão 1',[],'Sem horário fixo no PDF.');
c(1,'MO','MO','Monitoria Obrigatória',[o('Única',s(0,9,10))],'O PDF não informa código curricular.');
c(2,'FAMAT31012','C2','Cálculo Diferencial e Integral II',[o('1',s(0,10,11),s(1,10,11),s(2,10,11))]);
c(2,'ICBIM39204','ANAT','Anatomia Humana',[o('B',s(1,1,2,3,4),s(2,3,4,5))]);
c(2,'FEELT31201','PP','Programação Procedimental',[o('A1',s(3,0,1,2,3)),o('A2',s(3,0,1,4,5))],'Confirmar aulas comuns: o PDF mostra “A1/A” às 07:10 e 08:00; interpretado como A1/A2.');
c(2,'INFIS39031','FIS1','Física Básica: Mecânica',['1','2'].map(id=>o(id,s(1,6,7),s(2,8,9))));
c(2,'INFIS39032','E-FIS1','Experimental de Física Básica: Mecânica',[o('2',s(4,6,7)),o('3',s(4,8,9)),o('5',s(3,8,9)),o('6',s(3,10,11))]);
c(2,'FAMAT31022','ALG','Álgebra Linear',[o('1',s(3,6,7,8))]);
c(2,'FEELT32202','EXT2','Extensão 2',[],'Sem horário fixo no PDF.');
c(3,'FAMAT31013','C3','Cálculo Diferencial e Integral III',[o('1',s(0,2,3),s(1,2,3),s(2,2,3))]);
c(3,'FEELT31301','CE1','Circuitos Elétricos 1',['1','2'].map(id=>o(id,s(2,4,5),s(3,2,3,4))));
c(3,'FEELT31302','E-CE1','Experimental de Circuitos Elétricos 1',['1.1','1.2','2.1','2.2','3.1','3.2','4.1','4.2'].map(id=>{const n=Number(id[0]);return o(id,s(n<=2?0:1,...(n%2?[6,7]:[8,9])).map(m=>({...m,frequency:2})));}),'Aulas quinzenais. Calendário de alternância não informado; sobreposições são potenciais.');
c(3,'INFIS39033','FIS2','Física Básica: Eletricidade e Magnetismo',['1','2'].map(id=>o(id,s(0,4,5),s(1,4,5))));
c(3,'INFIS39034','E-FIS2','Experimental de Física Básica: Eletricidade e Magnetismo',[o('2',s(2,6,7)),o('3',s(3,6,7)),o('5',s(4,2,3)),o('6',s(4,4,5))]);
c(3,'FEMEC39102','MCS','Mecânica dos Sólidos',[o('1',s(3,9,10))],'Listada na continuação da tabela do 3º período; página 5 tem cabeçalho “4º período”. Conferir na matriz.');
c(3,'FAMAT31033','ESTAT','Estatística',[o('1',s(0,0,1),s(1,0,1))]);
c(3,'FEELT32302','EXT3','Extensão 3',[],'Sem horário fixo. Período inferido da continuação da tabela do 3º período.');
c(4,'FEELT31410','E-SDG','Experimental de Sistemas Digitais',[o('1',s(0,0,1)),o('2',s(0,2,3)),o('4',s(1,0,1)),o('5',s(1,2,3)),o('6',s(2,4,5))]);
c(4,'FEELT31409','SDG','Sistemas Digitais',[o('A',s(2,0,1)),o('B',s(3,2,3))]);
c(4,'FAMAT31031','MMT','Métodos Matemáticos',['1','2'].map(id=>o(id,s(2,10,11),s(4,6,7,8))));
c(4,'INFIS31402','FIS3','Física Básica: Oscilações, Ondas e Óptica',['1','2'].map(id=>o(id,s(0,8,9),s(2,8,9))));
c(4,'FEELT31401','ELA1','Eletrônica Analógica 1',['A','B'].map(id=>o(id,s(1,6,7),s(3,6,7))));
c(4,'FEELT31402','E-ELA1','Experimental de Eletrônica Analógica 1',[o('1',s(3,0,1)),o('2',s(3,2,3)),o('3',s(2,0,1)),o('4',s(2,2,3))]);
c(4,'IBTEC39301','BIOQ','Bioquímica',['B1','B2'].map(id=>o(id,s(4,9,10,11),s(4,2,3).map(m=>({...m,frequency:2,firstDate:id==='B1'?'2026-09-04':'2026-09-11'})))),'Teoria semanal. Laboratório quinzenal no campus Umuarama: B1 a partir de 04/09; B2 a partir de 11/09.');
c(4,'FEQUI39401','FT','Fenômenos de Transporte',[o('1',s(0,10,11),s(1,10,11)),o('2',s(0,4,5),s(1,4,5))]);
c(4,'FEELT32402','EXT4','Extensão 4',[],'Sem horário fixo no PDF.');
c(5,'FEELT32502','ELA2','Eletrônica Analógica 2',[o('B',s(1,0,1),s(2,2,3))]);
c(5,'FEELT31502','E-ELA2','Experimental de Eletrônica Analógica 2',[o('1',s(3,6,7)),o('2',s(3,8,9)),o('3',s(3,10,11)),o('4',s(0,6,7))]);
c(5,'FEELT32503','ININD1','Instrumentação Industrial 1',[o('A1',s(1,8,9),s(2,4),s(3,2)),o('A3',s(1,8,9),s(2,5),s(3,2))]);
c(5,'FEELT32504','SS','Sinais e Sistemas',[o('B',s(1,2,3),s(3,0,1))]);
c(5,'FEELT32507','SEMB1','Sistemas Embarcados 1',['A1','A2','A3'].map((id,i)=>o(id,s(0,i*2,i*2+1,8,9,10))));
c(5,'IERI39001','CECO','Ciências Econômicas',[o('B1',s(2,0,1),s(4,0,1))]);
c(5,'ICBIM39503','FISIO','Fisiologia',[o('B',s(2,7,8,9),s(4,7,8,9))]);
c(6,'FEELT31603','ITEL','Instalações Elétricas',[o('1',s(0,6,7))]);
c(6,'FEELT31604','E-ITEL','Experimental de Instalações Elétricas',[o('3',s(1,2,3)),o('4',s(1,4,5))]);
c(6,'FEELT32604','BIOMEC','Biomecânica',[o('B*',s(1,6,7,8,9))],'O asterisco da turma não é explicado no PDF.');
c(6,'FEELT32603','SCR','Sistemas de Controle Realimentado',[o('1',s(0,4,5),s(1,0,1))]);
c(6,'FEELT32605','PJI','Projeto Interdisciplinar em Engenharia Biomédica',[o('B',s(2,6,7))]);
c(6,'ICBIM39403','BIOF','Biofísica',[o('B',s(2,0,1),s(4,7,8,9,10))]);
c(6,'FEELT32601','E-SCR','Experimental de Sistemas de Controle Realimentado',[o('1',s(1,10,11)),o('3',s(2,8,9)),o('4',s(2,4,5))]);
c(6,'FEELT31612','PSB','Processamento de Sinais Biomédicos',[o('B',s(3,0,1,2,3))]);
c(7,'FAGEN39901','ADM','Administração',[o('1',s(0,0,1),s(2,2,3))]);
c(7,'FEELT32703','CTBIO','Ciência e Tecnologia dos Materiais em Engenharia Biomédica',[],'Não ofertada em 2026/2.',false);
c(7,'FEELT32705','FHUS','Fatores Humanos e Engenharia de Usabilidade',[o('B',s(4,2,3,4,5))]);
c(7,'FEELT31621','IMG1','Imagens Médicas 1',[o('B',s(0,4,5),s(1,4,5))]);
c(7,'FEELT31826','ECLIN1','Engenharia Clínica 1',[o('B',s(0,8,9),s(1,8,9))]);
c(7,'FEELT31806','IB1','Instrumentação Biomédica 1',[o('B',s(0,6,7),s(1,6,7),s(3,6,7))]);
c(7,'FEELT32704','RTA','Engenharia de Reabilitação e Tecnologias Assistivas',[o('B',s(3,2,3,4,5))]);
c(8,'FEELT31903','IB2','Instrumentação Biomédica 2',[o('B',s(0,2,3),s(1,0,1),s(2,2,3))]);
c(8,'FEELT31909','ECLIN2','Engenharia Clínica 2',[o('B',s(1,2,3),s(3,3,4))]);
c(8,'FEELT32803','IMG2','Imagens Médicas 2',[o('B',s(0,8,9),s(1,8,9))]);
c(8,'FEELT31825','GRH','Gestão de Resíduos Hospitalares',[o('B',s(2,7,8))]);
c(8,'FADIR39901','CSJ','Ciências Sociais e Jurídicas',[o('1',s(0,4,5),s(1,4,5))]);
c(8,'FEELT31823','TEL','Telemedicina',[o('B',s(3,8,9,10,11))]);
c(8,'FEELT31907','ATS','Avaliação de Tecnologias em Saúde',[o('B',s(3,0,1),s(2,4,5))]);
c(8,'FEELT32802','EHOS','Engenharia Hospitalar',[o('B*',s(2,0,1),s(3,6,7))],'O asterisco da turma não é explicado no PDF.');
c('9–10','FEELT31908','TCC','Trabalho de Conclusão de Curso',[],'Sem horário fixo. O PDF agrupa o 9º e o 10º período.');
c('9–10','FEELT31005','ESTÁGIO','Estágio Obrigatório em Engenharia Biomédica',[],'Sem horário fixo. O PDF agrupa o 9º e o 10º período.');
c('9–10','FEELT32903','EXT5','Atividades Curriculares de Extensão V',[],'Sem horário fixo. O PDF agrupa o 9º e o 10º período.');
// Numeração e cargas totais do fluxograma EB2020, versão 12 (página única).
const curriculum = [
[1,'C1',90],[2,'GA',60],[3,'EXPG',60],[4,'PSC',60],[5,'IEB',30],[6,'MTR',60],[7,'EXT1',90],
[8,'C2',90],[9,'ALG',45],[10,'FIS1',60],[11,'E-FIS1',30],[12,'PP',60],[13,'ANAT',105],[14,'EXT2',60],
[15,'C3',90],[16,'ESTAT',60],[17,'FIS2',60],[18,'E-FIS2',30],[19,'CE1',75],[20,'E-CE1',15],[21,'MCS',30],[22,'EXT3',90],
[23,'MMT',75],[24,'ELA1',60],[25,'E-ELA1',30],[26,'BIOQ',60],[27,'FIS3',60],[28,'FT',60],[29,'SDG',30],[30,'E-SDG',30],[31,'EXT4',60],
[32,'SS',60],[33,'ELA2',60],[34,'E-ELA2',30],[35,'FISIO',90],[36,'SEMB1',105],[37,'ININD1',60],[38,'CECO',60],
[39,'ITEL',30],[40,'E-ITEL',30],[41,'BIOMEC',60],[42,'BIOF',90],[43,'SCR',60],[44,'E-SCR',30],[45,'PSB',60],[46,'PJI',30],
[47,'ADM',60],[48,'CTBIO',60],[49,'IMG1',60],[50,'FHUS',60],[51,'RTA',60],[52,'IB1',90],[53,'ECLIN1',60],
[54,'CSJ',60],[55,'ATS',60],[56,'IMG2',60],[57,'GRH',30],[58,'TEL',60],[59,'IB2',90],[60,'ECLIN2',60],[61,'EHOS',60],
[62,'TCC',60],[63,'EXT5',120],[64,'ESTÁGIO',180]
];
const byNumber=new Map();
for(const [number,short,hours] of curriculum){const course=courses.find(c=>c.short===short);if(!course)throw Error('Disciplina curricular não encontrada: '+short);Object.assign(course,{curriculumNumber:number,hours,prerequisites:[],corequisites:[],minCompletedHours:0});byNumber.set(number,course);}
// Setas simples: pré-requisitos. Setas duplas: co-requisitos.
for(const [number,required] of [[8,1],[15,8],[23,15],[33,24],[56,49],[59,52],[60,53]])byNumber.get(number).prerequisites.push(byNumber.get(required).id);
for(const [a,b] of [[10,11],[17,18],[19,20],[24,25],[29,30],[33,34],[39,40],[43,44]]){byNumber.get(a).corequisites.push(byNumber.get(b).id);byNumber.get(b).corequisites.push(byNumber.get(a).id);}
byNumber.get(62).minCompletedHours=2700;
byNumber.get(64).minCompletedHours=2300;
byNumber.get(62).period=9;byNumber.get(63).period=9;byNumber.get(64).period=10;
byNumber.get(62).note='Sem horário fixo. Exige pelo menos 2.700 horas curriculares concluídas.';
byNumber.get(64).note='Sem horário fixo. Exige pelo menos 2.300 horas curriculares concluídas.';
byNumber.get(63).note='Sem horário fixo. Alocada no 9º período pelo fluxograma.';
byNumber.get(21).note='Período confirmado no fluxograma: 3º. O cabeçalho da página 5 do PDF de horários é inconsistente.';
byNumber.get(22).note='Sem horário fixo. Período confirmado no fluxograma: 3º.';
courses.sort((a,b)=>a.period-b.period);
root.BIO_DATA={courses,slots,semester:'2026.2'};
if(typeof module!=='undefined')module.exports=root.BIO_DATA;
})(typeof window==='undefined'?globalThis:window);
