import zipfile

src_path = r"D:\islamic-banking\Dokumen Grahadi\MAP KEMI 15013873200.docx"
doc = zipfile.ZipFile(src_path)
xml_content = doc.read('word/document.xml').decode('utf-8')

idx = xml_content.find('INFORMASI SLIK')
if idx != -1:
    print(xml_content[idx+3000:idx+6500])
