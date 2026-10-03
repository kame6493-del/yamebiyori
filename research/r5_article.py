# -*- coding: utf-8 -*-
import re,sys,html,urllib.request,os
os.makedirs("kennet",exist_ok=True)
for u in sys.argv[1:]:
    s=urllib.request.urlopen(urllib.request.Request(u,headers={"User-Agent":"Mozilla/5.0"}),timeout=30).read().decode("utf-8","ignore")
    t=re.sub(r"(?s)<script.*?</script>|<style.*?</style>","",s)
    t=re.sub(r"(?i)<br\s*/?>|</p>|</li>|</h\d>|</tr>","\n",t)
    t=html.unescape(re.sub(r"<[^>]+>","",t)); t=re.sub(r"[ \t\r]+"," ",t); t=re.sub(r"\n\s*\n+","\n",t)
    name=u.rstrip("/").split("/")[-1]
    open("kennet/"+name+".txt","w",encoding="utf-8").write(u+"\n"+t)
    print("==",name,len(t))
