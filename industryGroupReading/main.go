package main

import (
	"encoding/csv"
	"io/ioutil"
	"log"
	"os"
	"strings"

	"github.com/antchfx/xmlquery"
)

type Submission struct {
	EdgarSubmission struct{}
}

func main() {
	files, err := ioutil.ReadDir("xml_2017")
	if err != nil {
		log.Println("Error listing xml files")
		panic(err)
	}

	// Not on ACCESSIONNUMBER in case companies switched their industry
	c := [][]string{{"ACCESSIONNUMBER", "CIK", "Industry Group"}}
	// s := time.Now()

	log.Println("Found", len(files), "files")

	for i, file := range files {
		fname := "xml_2017/" + file.Name()
		f, err := os.Open(fname)
		if err != nil {
			log.Println("Error opening file")
			continue
		}

		doc, err := xmlquery.Parse(f)
		if err != nil {
			log.Println("Error parsing xml", fname)
			continue
		}

		od, err := xmlquery.Query(doc, "//offeringData")
		if err != nil || od == nil {
			log.Println("Error parsing offeringdata")
			continue
		}

		ig, err := xmlquery.Query(od, "/industryGroup")
		if err != nil || ig == nil {
			log.Println("Error parsing industryGroup")
			continue
		}

		igt, err := xmlquery.Query(ig, "/industryGroupType")
		if err != nil || igt == nil {
			log.Println("Error parsing industryGroupType")
			continue
		}

		cik := strings.Split(file.Name(), "_")[0]
		an := strings.Split(strings.Split(file.Name(), "_")[1], ".xml")[0]

		c = append(c, []string{an, cik, igt.InnerText()})
		f.Close()
		log.Println("Done", i, "/", len(files))
		// if i >= 1000 {
		// 	log.Println("Did", i+1, time.Since(s))
		// 	break
		// }
	}

	f, err := os.Create("industrygroups.csv")
	if err != nil {
		log.Println("Error opening csv")
		panic(err)
	}
	defer f.Close()

	w := csv.NewWriter(f)
	defer w.Flush()

	for _, record := range c {
		if err := w.Write(record); err != nil {
			log.Fatal("Failed to write record", err.Error())
		}
	}
}
